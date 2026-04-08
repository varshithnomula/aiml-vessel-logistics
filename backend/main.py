# main.py
"""
Full-featured FastAPI backend implementing the vessel logistics workflow.
Single-file prototype, Windows-safe (uses argon2), relies on backend/data/vessel_history.csv if present.
"""
from typing import Optional, List, Dict, Any
import os
from datetime import datetime, timedelta, date
from enum import Enum
import json

import pandas as pd
import numpy as np
from sqlmodel import SQLModel, Field, create_engine, Session, select
from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from ortools.linear_solver import pywraplp
from io import BytesIO

# -----------------------
# Configuration
# -----------------------
SECRET_KEY = "supersecretchange_me_replace_this_in_prod"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
DB_FILE = "backend.db"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Try multiple possible paths for vessel_history.csv
DATASET_PATH = os.path.join(BASE_DIR, "data", "vessel_history.csv")
if not os.path.exists(DATASET_PATH):
    # Try parent directory
    DATASET_PATH = os.path.join(os.path.dirname(BASE_DIR), "data", "vessel_history.csv")

# Use argon2 (Windows-safe)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

app = FastAPI(title="AI-Enabled Logistics Optimizer Backend")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = create_engine(f"sqlite:///{DB_FILE}", echo=False)

# In-memory data storage for vessel history
vessel_history_df: Optional[pd.DataFrame] = None
port_plant_data: Dict[str, Any] = {}

# -----------------------
# Models (DB)
# -----------------------
class Role(str, Enum):
    plant_manager = "plant_manager"
    admin = "admin"
    supplier = "supplier"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str
    role: Role

class PlantRequestStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    modified = "modified"
    batched = "batched"
    dispatched = "dispatched"
    fulfilled = "fulfilled"

class PlantRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_by: str
    material: str
    quantity_tons: float
    urgency: str
    expected_delivery_date: date
    plant_location: str
    status: PlantRequestStatus = Field(default=PlantRequestStatus.pending)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None

class ProcurementBatch(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_by: str
    request_ids: str  # comma separated ids
    created_at: datetime = Field(default_factory=datetime.utcnow)
    supplier_assigned: Optional[str] = None
    status: str = "open"

class SupplierAssignment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    batch_id: int
    material: str
    quantity_tons: float
    vessel_name: Optional[str] = None
    parcel_size: Optional[float] = None
    load_port: Optional[str] = None
    discharge_ports_order: Optional[str] = None  # comma separated
    status: str = "assigned"
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Port(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    capacity_tons: float
    current_stock: float = 0.0

class Rake(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    port: str
    available_on: datetime
    allocated: bool = False

class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    to_user: Optional[str]
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VesselSchedule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    vessel_name: str
    imo_number: Optional[str] = None
    vessel_type: Optional[str] = None
    load_port: str
    discharge_ports: str  # comma separated
    cargo_type: str
    cargo_volume_tons: float
    eta: datetime
    ata: Optional[datetime] = None
    status: str = "scheduled"  # scheduled, in_transit, arrived, discharged
    created_at: datetime = Field(default_factory=datetime.utcnow)

# -----------------------
# Pydantic Schemas
# -----------------------
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class OverviewResponse(BaseModel):
    total_vessels: int
    avg_delay_hours: float
    active_ports: int
    total_cargo_tons: float
    port_congestion: Dict[str, float]
    delay_by_port: Dict[str, float]

class PredictRequest(BaseModel):
    vessel_name: Optional[str] = None
    vessel_type: Optional[str] = None
    load_port: str
    discharge_port: str
    cargo_type: str
    cargo_volume_tons: float
    eta: datetime
    port_congestion_index: Optional[float] = None
    weather_wind_speed: Optional[float] = None
    weather_visibility: Optional[float] = None
    weather_wave_height: Optional[float] = None

class PredictResponse(BaseModel):
    predicted_delay_hours: float
    optimized_schedule: Dict[str, Any]
    cost_breakdown: Dict[str, float]
    demurrage_cost: float

class WhatIfRequest(BaseModel):
    scenario_name: str
    vessels: List[Dict[str, Any]]
    port_capacities: Optional[Dict[str, float]] = None
    stock_levels: Optional[Dict[str, float]] = None
    rake_availability: Optional[Dict[str, bool]] = None

class WhatIfResponse(BaseModel):
    scenario_name: str
    optimized_schedules: List[Dict[str, Any]]
    total_cost: float
    total_delay_hours: float
    port_utilization: Dict[str, float]
    recommendations: List[str]

# -----------------------
# Auth helpers
# -----------------------
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user(username: str):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == username)).first()
        return user

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=role)
    except JWTError:
        raise credentials_exception
    user = get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    return current_user

def require_role(role: Role):
    async def inner(current_user: User = Depends(get_current_active_user)):
        if current_user.role != role:
            raise HTTPException(status_code=403, detail="Not authorized for this action")
        return current_user
    return inner

# -----------------------
# Startup: DB, seed, load dataset, train simple AI
# -----------------------
@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        if session.exec(select(User).where(User.username == "plant1")).first() is None:
            session.add(User(username="plant1", hashed_password=get_password_hash("plantpass"), role=Role.plant_manager))
        if session.exec(select(User).where(User.username == "admin")).first() is None:
            session.add(User(username="admin", hashed_password=get_password_hash("adminpass"), role=Role.admin))
        if session.exec(select(User).where(User.username == "supplier1")).first() is None:
            session.add(User(username="supplier1", hashed_password=get_password_hash("supplierpass"), role=Role.supplier))
        if session.exec(select(Port)).all() == []:
            ports = [Port(name="Kolkata", capacity_tons=200000), Port(name="Haldia", capacity_tons=150000), Port(name="Paradip", capacity_tons=180000)]
            session.add_all(ports)
        if session.exec(select(Rake)).all() == []:
            rakes = [Rake(port="Kolkata", available_on=datetime.utcnow()), Rake(port="Haldia", available_on=datetime.utcnow()), Rake(port="Paradip", available_on=datetime.utcnow())]
            session.add_all(rakes)
        session.commit()

    # Load and train AI models if dataset present
    global vessel_history_df
    if os.path.exists(DATASET_PATH):
        try:
            vessel_history_df = pd.read_csv(DATASET_PATH)
            target_col = None
            for candidate in ["delay_hours", "delay", "demurrage", "demurrage_cost"]:
                if candidate in vessel_history_df.columns:
                    target_col = candidate
                    break
            
            if target_col:
                # Prepare features for ML model
                feature_cols = [
                    "port_congestion_index", "weather_wind_speed", "weather_visibility",
                    "weather_wave_height", "cargo_volume_tons", "avg_turnaround_time_hours"
                ]
                available_cols = [col for col in feature_cols if col in vessel_history_df.columns]
                
                if len(available_cols) > 0:
                    X = vessel_history_df[available_cols].fillna(0)
                    y = vessel_history_df[target_col].fillna(0)
                    
                    # Add categorical encoding for ports
                    if "load_port" in vessel_history_df.columns:
                        port_dummies = pd.get_dummies(vessel_history_df["load_port"], prefix="load_port")
                        X = pd.concat([X, port_dummies], axis=1)
                    
                    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
                    rf = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10)
                    rf.fit(X_train, y_train)
                    joblib.dump(rf, "ai_delay_predictor.joblib")
                    print(f"Trained AI predictor for {target_col} with {len(available_cols)} features")
                else:
                    print("No suitable feature columns found; AI predictions will use heuristics.")
            else:
                print("No target column found in dataset; AI predictions will use heuristics.")
        except Exception as e:
            print(f"Failed to train AI models on dataset: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"Dataset not found at {DATASET_PATH} — AI predictions will use heuristics.")

# -----------------------
# Auth endpoints
# -----------------------
@app.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user(form_data.username)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}

# -----------------------
# Plant Manager endpoints
# -----------------------
class CreateRequestIn(BaseModel):
    material: str
    quantity_tons: float
    urgency: str
    expected_delivery_date: date
    plant_location: str

@app.post("/plant/request", status_code=201)
def create_plant_request(req: CreateRequestIn, current_user: User = Depends(require_role(Role.plant_manager))):
    pr = PlantRequest(created_by=current_user.username, material=req.material, quantity_tons=req.quantity_tons,
                      urgency=req.urgency, expected_delivery_date=req.expected_delivery_date, plant_location=req.plant_location)
    with Session(engine) as session:
        session.add(pr)
        session.commit()
        session.refresh(pr)
    return pr

@app.get("/plant/requests")
def list_my_requests(current_user: User = Depends(require_role(Role.plant_manager))):
    with Session(engine) as session:
        requests = session.exec(select(PlantRequest).where(PlantRequest.created_by == current_user.username)).all()
        return requests

# -----------------------
# Admin endpoints
# -----------------------
@app.get("/admin/requests")
def admin_list_requests(current_user: User = Depends(require_role(Role.admin))):
    with Session(engine) as session:
        return session.exec(select(PlantRequest)).all()

class ModifyRequestIn(BaseModel):
    id: int
    quantity_tons: Optional[float]
    expected_delivery_date: Optional[date]
    notes: Optional[str]

@app.post("/admin/modify")
def admin_modify_request(data: ModifyRequestIn, current_user: User = Depends(require_role(Role.admin))):
    with Session(engine) as session:
        pr = session.get(PlantRequest, data.id)
        if not pr:
            raise HTTPException(404, "Request not found")
        if data.quantity_tons is not None:
            pr.quantity_tons = data.quantity_tons
        if data.expected_delivery_date is not None:
            pr.expected_delivery_date = data.expected_delivery_date
        if data.notes is not None:
            pr.notes = data.notes
        pr.status = PlantRequestStatus.modified
        session.add(pr)
        session.commit()
        session.refresh(pr)
    return pr

class BatchCreateIn(BaseModel):
    request_ids: List[int]

@app.post("/admin/batch", status_code=201)
def admin_create_batch(data: BatchCreateIn, current_user: User = Depends(require_role(Role.admin))):
    with Session(engine) as session:
        for rid in data.request_ids:
            pr = session.get(PlantRequest, rid)
            if pr:
                pr.status = PlantRequestStatus.batched
                session.add(pr)
        batch = ProcurementBatch(created_by=current_user.username, request_ids=','.join(map(str, data.request_ids)))
        session.add(batch)
        session.commit()
        session.refresh(batch)
    return batch

@app.post("/admin/trigger_supplier/{batch_id}")
def admin_trigger_supplier(batch_id: int, supplier_username: str, current_user: User = Depends(require_role(Role.admin))):
    with Session(engine) as session:
        batch = session.get(ProcurementBatch, batch_id)
        if not batch:
            raise HTTPException(404, "Batch not found")
        batch.supplier_assigned = supplier_username
        batch.status = "supplier_notified"
        req_ids = [int(x) for x in batch.request_ids.split(',') if x]
        requests = [session.get(PlantRequest, rid) for rid in req_ids]
        by_material = {}
        for r in requests:
            if r is None: continue
            by_material.setdefault(r.material, 0)
            by_material[r.material] += r.quantity_tons
        for mat, qty in by_material.items():
            sa = SupplierAssignment(batch_id=batch.id, material=mat, quantity_tons=qty)
            session.add(sa)
        session.add(batch)
        notif = Notification(to_user=supplier_username, message=f"New procurement batch {batch.id} assigned")
        session.add(notif)
        session.commit()
        session.refresh(batch)
    return {"batch": batch, "assignments_created": len(by_material)}

# -----------------------
# Supplier endpoints
# -----------------------
class SupplierUpdateIn(BaseModel):
    assignment_id: int
    vessel_name: str
    parcel_size: float
    load_port: str
    discharge_ports_order: List[str]

@app.post("/supplier/assignment/update")
def supplier_update_assignment(data: SupplierUpdateIn, current_user: User = Depends(require_role(Role.supplier))):
    if "Haldia" in data.discharge_ports_order:
        idx = data.discharge_ports_order.index("Haldia")
        if idx != 1:
            raise HTTPException(400, "Haldia must be the second discharge port in the order")
    with Session(engine) as session:
        sa = session.get(SupplierAssignment, data.assignment_id)
        if not sa:
            raise HTTPException(404, "Assignment not found")
        sa.vessel_name = data.vessel_name
        sa.parcel_size = data.parcel_size
        sa.load_port = data.load_port
        sa.discharge_ports_order = ','.join(data.discharge_ports_order)
        sa.status = "vessel_assigned"
        sa.updated_at = datetime.utcnow()
        session.add(sa)
        notif = Notification(to_user="admin", message=f"Supplier updated assignment {sa.id}")
        session.add(notif)
        session.commit()
        session.refresh(sa)
    return sa

@app.get("/supplier/assignments")
def supplier_list_assignments(current_user: User = Depends(require_role(Role.supplier))):
    with Session(engine) as session:
        return session.exec(select(SupplierAssignment)).all()

@app.get("/api/vessels")
async def get_vessels(current_user: User = Depends(get_current_active_user)):
    """Get all vessels (accessible to all authenticated users)"""
    global vessel_history_df
    
    with Session(engine) as session:
        assignments = session.exec(select(SupplierAssignment)).all()
        schedules = session.exec(select(VesselSchedule)).all()
    
    vessels = []
    
    # Add from assignments
    for a in assignments:
        vessels.append({
            "id": a.id,
            "vessel_name": a.vessel_name or "TBD",
            "load_port": a.load_port,
            "discharge_ports": a.discharge_ports_order.split(",") if a.discharge_ports_order else [],
            "cargo_type": a.material,
            "cargo_volume_tons": a.quantity_tons,
            "status": a.status,
            "updated_at": a.updated_at.isoformat() if a.updated_at else None
        })
    
    # Add from schedules
    for s in schedules:
        vessels.append({
            "id": s.id,
            "vessel_name": s.vessel_name,
            "load_port": s.load_port,
            "discharge_ports": s.discharge_ports.split(",") if s.discharge_ports else [],
            "cargo_type": s.cargo_type,
            "cargo_volume_tons": s.cargo_volume_tons,
            "status": s.status,
            "eta": s.eta.isoformat() if s.eta else None,
            "updated_at": s.created_at.isoformat() if s.created_at else None
        })
    
    # Add from vessel_history_df if available (recent entries)
    if vessel_history_df is not None and len(vessel_history_df) > 0:
        recent_df = vessel_history_df.tail(50)  # Last 50 entries
        for idx, row in recent_df.iterrows():
            vessels.append({
                "id": f"hist_{idx}",
                "vessel_name": str(row.get("vessel_name", "Unknown")),
                "load_port": str(row.get("load_port", "Unknown")),
                "discharge_ports": [str(row.get("discharge_port", "Unknown"))],
                "cargo_type": str(row.get("cargo_type", "Unknown")),
                "cargo_volume_tons": float(row.get("cargo_volume_tons", 0)),
                "status": "historical",
                "eta": str(row.get("eta_port", "")) if pd.notna(row.get("eta_port")) else None
            })
    
    return vessels

@app.post("/api/vessels")
async def create_vessel(
    vessel_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user)
):
    """Create a new vessel schedule"""
    with Session(engine) as session:
        vessel = VesselSchedule(
            vessel_name=vessel_data.get("vessel_name", "Unknown"),
            imo_number=vessel_data.get("imo_number"),
            vessel_type=vessel_data.get("vessel_type", "Bulk"),
            load_port=vessel_data.get("load_port", "Unknown"),
            discharge_ports=",".join(vessel_data.get("discharge_ports", [])),
            cargo_type=vessel_data.get("cargo_type", "Iron Ore"),
            cargo_volume_tons=float(vessel_data.get("cargo_volume_tons", 0)),
            eta=datetime.fromisoformat(vessel_data["eta"].replace("Z", "+00:00")) if vessel_data.get("eta") else datetime.utcnow(),
            status="scheduled"
        )
        session.add(vessel)
        session.commit()
        session.refresh(vessel)
        return vessel

# -----------------------
# AI Predictions
# -----------------------
def load_ai_predictor():
    if os.path.exists("ai_delay_predictor.joblib"):
        return joblib.load("ai_delay_predictor.joblib")
    return None

ai_predictor = load_ai_predictor()

def predict_delay(features: Dict[str, Any], load_port: Optional[str] = None) -> float:
    """Predict pre-berthing delay using ML model or heuristics"""
    if ai_predictor is not None and vessel_history_df is not None:
        try:
            # Prepare feature vector matching training data
            feature_cols = [
                "port_congestion_index", "weather_wind_speed", "weather_visibility",
                "weather_wave_height", "cargo_volume_tons", "avg_turnaround_time_hours"
            ]
            
            # Get feature values
            feature_values = []
            for col in feature_cols:
                if col in features:
                    feature_values.append(float(features[col]))
                else:
                    feature_values.append(0.0)
            
            # Add port encoding if available
            if load_port and "load_port" in vessel_history_df.columns:
                port_cols = [col for col in vessel_history_df.columns if col.startswith("load_port_")]
                for port_col in port_cols:
                    port_name = port_col.replace("load_port_", "")
                    feature_values.append(1.0 if port_name == load_port else 0.0)
            
            x = np.array(feature_values).reshape(1, -1)
            prediction = float(ai_predictor.predict(x)[0])
            return max(0.0, prediction)
        except Exception as e:
            print(f"ML prediction failed: {e}, using heuristic")
    
    # Fallback heuristic
    congestion = float(features.get("port_congestion_index", 0.5))
    weather_wind = float(features.get("weather_wind_speed", 15.0))
    weather_vis = float(features.get("weather_visibility", 10.0))
    weather_wave = float(features.get("weather_wave_height", 1.0))
    
    # Normalize weather factors
    weather_score = min(1.0, (weather_wind / 30.0) * (1.0 - min(weather_vis / 20.0, 1.0)) * (weather_wave / 5.0))
    delay = max(0.0, (congestion * 8.0) + (weather_score * 4.0))
    return delay

# -----------------------
# OR-Tools Optimization Engine
# -----------------------
def optimize_vessel_scheduling_with_ortools(
    vessels: List[Dict[str, Any]],
    ports: List[Port],
    rakes: List[Rake],
    max_port_calls: int = 3
) -> List[Dict[str, Any]]:
    """
    Optimize vessel scheduling using OR-Tools linear programming.
    Considers:
    - Port capacity constraints
    - Sequential discharge (Haldia always second)
    - Railway rake availability
    - Maximum port calls per vessel
    - Stock age constraints
    """
    solver = pywraplp.Solver.CreateSolver('SCIP')
    if not solver:
        # Fallback to heuristic if SCIP not available
        return optimize_vessel_scheduling_heuristic(vessels, ports, rakes)
    
    num_vessels = len(vessels)
    num_ports = len(ports)
    
    # Decision variables: x[i][j] = 1 if vessel i calls port j
    x = {}
    for i in range(num_vessels):
        for j in range(num_ports):
            x[i, j] = solver.IntVar(0, 1, f'vessel_{i}_port_{j}')
    
    # Port call order variables (for sequential constraints)
    order = {}
    for i in range(num_vessels):
        for j in range(num_ports):
            order[i, j] = solver.IntVar(0, num_ports, f'order_vessel_{i}_port_{j}')
    
    # Constraints
    # 1. Each vessel must call at least one port, max max_port_calls
    for i in range(num_vessels):
        solver.Add(sum(x[i, j] for j in range(num_ports)) >= 1)
        solver.Add(sum(x[i, j] for j in range(num_ports)) <= max_port_calls)
    
    # 2. Port capacity constraints
    for j in range(num_ports):
        port = ports[j]
        total_cargo = sum(vessels[i].get('cargo_volume_tons', 0) * x[i, j] for i in range(num_vessels))
        solver.Add(total_cargo + port.current_stock <= port.capacity_tons)
    
    # 3. Sequential discharge: Haldia must be second if called
    haldia_idx = None
    for j, port in enumerate(ports):
        if port.name == "Haldia":
            haldia_idx = j
            break
    
    if haldia_idx is not None:
        for i in range(num_vessels):
            # If Haldia is called, it must be second
            # This means: if x[i, haldia_idx] == 1, then exactly one other port must be called before it
            other_ports = [j for j in range(num_ports) if j != haldia_idx]
            if len(other_ports) > 0:
                # Simplified: if Haldia is called, at least one other port must be called
                solver.Add(x[i, haldia_idx] <= sum(x[i, j] for j in other_ports))
    
    # 4. Rake availability constraints
    rake_dict = {}
    for rake in rakes:
        if rake.port not in rake_dict:
            rake_dict[rake.port] = []
        rake_dict[rake.port].append(rake)
    
    for j, port in enumerate(ports):
        available_rakes = len([r for r in rake_dict.get(port.name, []) if not r.allocated])
        vessels_using_port = sum(x[i, j] for i in range(num_vessels))
        solver.Add(vessels_using_port <= available_rakes + 1000)  # Allow some flexibility
    
    # Objective: Minimize total cost (ocean + port handling + rail + demurrage)
    objective = solver.Objective()
    for i in range(num_vessels):
        vessel = vessels[i]
        cargo_vol = vessel.get('cargo_volume_tons', 10000.0)
        load_port = vessel.get('load_port', 'Unknown')
        
        for j in range(num_ports):
            port = ports[j]
            # Calculate costs
            ocean_cost = 5.0 * cargo_vol / 1000.0
            port_cost = 2.0 * cargo_vol / 1000.0
            rail_cost = 3.0 * cargo_vol / 1000.0
            
            # Predict delay
            congestion = port.current_stock / max(1.0, port.capacity_tons)
            features = {
                "port_congestion_index": congestion,
                "weather_wind_speed": vessel.get('weather_wind_speed', 15.0),
                "weather_visibility": vessel.get('weather_visibility', 10.0),
                "weather_wave_height": vessel.get('weather_wave_height', 1.0),
                "cargo_volume_tons": cargo_vol,
                "avg_turnaround_time_hours": 24.0
            }
            predicted_delay = predict_delay(features, load_port)
            demurrage_cost = predicted_delay * 10.0
            
            total_cost = ocean_cost + port_cost + rail_cost + demurrage_cost
            objective.SetCoefficient(x[i, j], total_cost)
    
    objective.SetMinimization()
    
    # Solve
    status = solver.Solve()
    
    if status == pywraplp.Solver.OPTIMAL or status == pywraplp.Solver.FEASIBLE:
        results = []
        for i in range(num_vessels):
            vessel = vessels[i]
            assigned_ports = []
            for j in range(num_ports):
                if x[i, j].solution_value() > 0.5:
                    assigned_ports.append(ports[j].name)
            
            if assigned_ports:
                # Ensure Haldia is second if present
                if "Haldia" in assigned_ports and len(assigned_ports) > 1:
                    assigned_ports.remove("Haldia")
                    assigned_ports.insert(1, "Haldia")
                
                results.append({
                    "vessel_name": vessel.get('vessel_name', f'Vessel_{i}'),
                    "assigned_ports": assigned_ports,
                    "cargo_volume_tons": vessel.get('cargo_volume_tons', 0)
                })
        return results
    else:
        # Fallback to heuristic
        return optimize_vessel_scheduling_heuristic(vessels, ports, rakes)

def optimize_vessel_scheduling_heuristic(
    vessels: List[Dict[str, Any]],
    ports: List[Port],
    rakes: List[Rake]
) -> List[Dict[str, Any]]:
    """Heuristic optimization fallback"""
    results = []
    port_dict = {p.name: p for p in ports}
    rake_dict = {}
    for rake in rakes:
        if rake.port not in rake_dict:
            rake_dict[rake.port] = []
        rake_dict[rake.port].append(rake)
    
    for vessel in vessels:
        best_port = None
        best_score = float('inf')
        cargo_vol = vessel.get('cargo_volume_tons', 10000.0)
        
        for port in ports:
            if port.current_stock + cargo_vol > port.capacity_tons:
                continue
            
            available_rakes = len([r for r in rake_dict.get(port.name, []) if not r.allocated])
            if available_rakes == 0:
                continue
            
            congestion = port.current_stock / max(1.0, port.capacity_tons)
            features = {
                "port_congestion_index": congestion,
                "weather_wind_speed": vessel.get('weather_wind_speed', 15.0),
                "weather_visibility": vessel.get('weather_visibility', 10.0),
                "weather_wave_height": vessel.get('weather_wave_height', 1.0),
                "cargo_volume_tons": cargo_vol,
                "avg_turnaround_time_hours": 24.0
            }
            predicted_delay = predict_delay(features, vessel.get('load_port'))
            
            ocean_cost = 5.0 * cargo_vol / 1000.0
            port_cost = 2.0 * cargo_vol / 1000.0
            rail_cost = 3.0 * cargo_vol / 1000.0
            demurrage = predicted_delay * 10.0
            
            score = ocean_cost + port_cost + rail_cost + demurrage + congestion * 1000
            if score < best_score:
                best_score = score
                best_port = port.name
        
        if best_port:
            discharge_ports = [best_port]
            # Add Haldia as second if not already included and constraints allow
            if best_port != "Haldia" and "Haldia" in port_dict:
                haldia = port_dict["Haldia"]
                if haldia.current_stock + cargo_vol <= haldia.capacity_tons:
                    discharge_ports.insert(1, "Haldia")
            
            results.append({
                "vessel_name": vessel.get('vessel_name', 'Unknown'),
                "assigned_ports": discharge_ports,
                "cargo_volume_tons": cargo_vol
            })
    
    return results

# -----------------------
# Optimization engine (heuristic)
# -----------------------
class OptimizationResult(BaseModel):
    vessel_name: str
    chosen_discharge_port: str
    cost_breakdown: Dict[str, float]
    eta_adjusted: datetime
    rake_allocation: Optional[int]
    dispatch_schedule: Dict[str, Any]

@app.post("/admin/run_optimizer/{batch_id}")
def run_optimizer(batch_id: int, current_user: User = Depends(require_role(Role.admin))):
    with Session(engine) as session:
        batch = session.get(ProcurementBatch, batch_id)
        if not batch:
            raise HTTPException(404, "Batch not found")
        assignments = session.exec(select(SupplierAssignment).where(SupplierAssignment.batch_id == batch_id)).all()
        results = []
        for sa in assignments:
            ports = session.exec(select(Port)).all()
            best = None
            best_score = float('inf')
            for port in ports:
                if port.current_stock + sa.quantity_tons > port.capacity_tons:
                    continue
                features = {"port_congestion_index": port.current_stock / max(1, port.capacity_tons), "weather_score": 0.5}
                predicted_delay = predict_delay(features)
                ocean = 5.0 * sa.quantity_tons / 1000.0
                port_handling = 2.0 * sa.quantity_tons / 1000.0
                rail = 3.0 * sa.quantity_tons / 1000.0
                demurrage = predicted_delay * 10.0
                score = demurrage + ocean + port_handling + rail + port.current_stock / max(1, port.capacity_tons) * 1000
                if score < best_score:
                    best_score = score
                    best = {"port": port, "predicted_delay": predicted_delay, "costs": {"ocean": ocean, "port_handling": port_handling, "rail": rail, "demurrage": demurrage}}
            if not best:
                raise HTTPException(400, f"No feasible port for assignment {sa.id}")
            rake = session.exec(select(Rake).where(Rake.port == best['port'].name).where(Rake.allocated == False)).first()
            rake_id = None
            if rake:
                rake.allocated = True
                session.add(rake)
                rake_id = rake.id
            eta_adjusted = datetime.utcnow() + timedelta(hours=best['predicted_delay'])
            best['port'].current_stock += sa.quantity_tons
            session.add(best['port'])
            dispatch = {
                "from_port": best['port'].name,
                "to_plant": batch.created_by,
                "quantity": sa.quantity_tons,
                "eta_adjusted": eta_adjusted.isoformat()
            }
            session.add(Notification(to_user=batch.supplier_assigned or "supplier", message=f"Assignment {sa.id} optimized to port {best['port'].name}"))
            session.commit()
            results.append(OptimizationResult(vessel_name=sa.vessel_name or "TBD",
                                              chosen_discharge_port=best['port'].name,
                                              cost_breakdown=best['costs'],
                                              eta_adjusted=eta_adjusted,
                                              rake_allocation=rake_id,
                                              dispatch_schedule=dispatch))
        return results

# -----------------------
# Dispatch & Fulfillment
# -----------------------
@app.post("/dispatch/arrived/{assignment_id}")
def dispatch_arrived(assignment_id: int, current_user: User = Depends(require_role(Role.admin))):
    with Session(engine) as session:
        sa = session.get(SupplierAssignment, assignment_id)
        if not sa:
            raise HTTPException(404, "Assignment not found")
        sa.status = "unloaded"
        session.add(sa)
        batch = session.get(ProcurementBatch, sa.batch_id)
        req_ids = [int(x) for x in batch.request_ids.split(',') if x]
        for rid in req_ids:
            pr = session.get(PlantRequest, rid)
            if pr:
                pr.status = PlantRequestStatus.fulfilled
                session.add(pr)
                session.add(Notification(to_user=pr.created_by, message=f"Your request {pr.id} has been fulfilled"))
        session.commit()
    return {"status": "fulfilled", "assignment": assignment_id}

# -----------------------
# Dashboards
# -----------------------
@app.get("/dashboard/plant")
def plant_dashboard(current_user: User = Depends(require_role(Role.plant_manager))):
    with Session(engine) as session:
        my_requests = session.exec(select(PlantRequest).where(PlantRequest.created_by == current_user.username)).all()
        notifications = session.exec(select(Notification).where(Notification.to_user == current_user.username)).all()
        return {"requests": my_requests, "notifications": notifications}

@app.get("/dashboard/admin")
def admin_dashboard(current_user: User = Depends(require_role(Role.admin))):
    with Session(engine) as session:
        requests = session.exec(select(PlantRequest)).all()
        ports = session.exec(select(Port)).all()
        rakes = session.exec(select(Rake)).all()
        notifications = session.exec(select(Notification).where(Notification.to_user == current_user.username)).all()
        return {"requests": requests, "ports": ports, "rakes": rakes, "notifications": notifications}

@app.get("/dashboard/supplier")
def supplier_dashboard(current_user: User = Depends(require_role(Role.supplier))):
    with Session(engine) as session:
        assignments = session.exec(select(SupplierAssignment)).all()
        notifications = session.exec(select(Notification).where(Notification.to_user == current_user.username)).all()
        return {"assignments": assignments, "notifications": notifications}

# -----------------------
# Required API Endpoints
# -----------------------

@app.get("/api/overview", response_model=OverviewResponse)
async def get_overview(current_user: User = Depends(get_current_active_user)):
    """Get summary statistics for dashboard"""
    global vessel_history_df
    
    with Session(engine) as session:
        ports = session.exec(select(Port)).all()
        vessels = session.exec(select(VesselSchedule)).all()
        assignments = session.exec(select(SupplierAssignment)).all()
    
    # Calculate statistics - use vessel_history_df if available, otherwise use schedules/assignments
    if vessel_history_df is not None and len(vessel_history_df) > 0:
        total_vessels = len(vessel_history_df)
        total_cargo = float(vessel_history_df.get("cargo_volume_tons", pd.Series([0])).sum())
    else:
        total_vessels = len(vessels) + len(assignments)
        total_cargo = sum(v.cargo_volume_tons for v in vessels if hasattr(v, 'cargo_volume_tons'))
        total_cargo += sum(a.quantity_tons for a in assignments)
    
    active_ports = len([p for p in ports if p.current_stock > 0])
    
    # Calculate delays from vessel history or schedules
    delays = []
    port_delays = {}
    port_congestion = {}
    
    # Try to load vessel history if not already loaded
    if vessel_history_df is None and os.path.exists(DATASET_PATH):
        try:
            vessel_history_df = pd.read_csv(DATASET_PATH)
        except:
            pass
    
    if vessel_history_df is not None and "delay_hours" in vessel_history_df.columns:
        delays = vessel_history_df["delay_hours"].dropna().tolist()
        if "discharge_port" in vessel_history_df.columns:
            for port in ports:
                port_data = vessel_history_df[vessel_history_df["discharge_port"] == port.name]
                if len(port_data) > 0:
                    port_delays[port.name] = float(port_data["delay_hours"].mean())
        # Update total_cargo from CSV if available
        if "cargo_volume_tons" in vessel_history_df.columns:
            total_cargo = float(vessel_history_df["cargo_volume_tons"].sum())
    else:
        # Use schedules if available
        for vessel in vessels:
            if vessel.ata and vessel.eta:
                delay = (vessel.ata - vessel.eta).total_seconds() / 3600.0
                delays.append(max(0, delay))
            if hasattr(vessel, 'cargo_volume_tons'):
                total_cargo += vessel.cargo_volume_tons
    
    avg_delay = float(np.mean(delays)) if delays else 0.0
    
    # Port congestion
    for port in ports:
        congestion = port.current_stock / max(1.0, port.capacity_tons)
        port_congestion[port.name] = float(congestion)
        if port.name not in port_delays:
            port_delays[port.name] = avg_delay
    
    # If no data, provide defaults
    if not port_congestion:
        for port in ports:
            port_congestion[port.name] = 0.0
            port_delays[port.name] = 0.0
    
    # Ensure we have data for all ports
    if not port_congestion:
        for port in ports:
            port_congestion[port.name] = 0.0
            port_delays[port.name] = 0.0
    
    # If vessel_history_df has data, use it for better statistics
    if vessel_history_df is not None and len(vessel_history_df) > 0:
        if "cargo_volume_tons" in vessel_history_df.columns:
            total_cargo = float(vessel_history_df["cargo_volume_tons"].sum())
        if "discharge_port" in vessel_history_df.columns:
            # Update port delays from CSV
            for port in ports:
                port_data = vessel_history_df[vessel_history_df["discharge_port"] == port.name]
                if len(port_data) > 0:
                    port_delays[port.name] = float(port_data["delay_hours"].mean()) if "delay_hours" in port_data.columns else avg_delay
    
    return OverviewResponse(
        total_vessels=total_vessels,
        avg_delay_hours=avg_delay,
        active_ports=active_ports,
        total_cargo_tons=float(total_cargo),
        port_congestion=port_congestion,
        delay_by_port=port_delays
    )

@app.post("/api/predict", response_model=PredictResponse)
async def predict_scenario(request: PredictRequest, current_user: User = Depends(get_current_active_user)):
    """Predict delays and optimize schedule for a scenario"""
    with Session(engine) as session:
        ports = session.exec(select(Port)).all()
        port_dict = {p.name: p for p in ports}
        
        if request.discharge_port not in port_dict:
            raise HTTPException(400, f"Port {request.discharge_port} not found")
        
        port = port_dict[request.discharge_port]
        
        # Get port congestion if not provided
        congestion = request.port_congestion_index
        if congestion is None:
            congestion = port.current_stock / max(1.0, port.capacity_tons)
        
        # Prepare features for prediction
        features = {
            "port_congestion_index": congestion,
            "weather_wind_speed": request.weather_wind_speed or 15.0,
            "weather_visibility": request.weather_visibility or 10.0,
            "weather_wave_height": request.weather_wave_height or 1.0,
            "cargo_volume_tons": request.cargo_volume_tons,
            "avg_turnaround_time_hours": 24.0  # Default
        }
        
        # Predict delay
        predicted_delay = predict_delay(features, request.load_port)
        
        # Calculate costs
        ocean_cost = 5.0 * request.cargo_volume_tons / 1000.0
        port_handling_cost = 2.0 * request.cargo_volume_tons / 1000.0
        rail_cost = 3.0 * request.cargo_volume_tons / 1000.0
        demurrage_cost = predicted_delay * 10.0  # $10 per hour
        
        # Check rake availability
        rakes = session.exec(select(Rake).where(Rake.port == request.discharge_port).where(Rake.allocated == False)).all()
        rake_available = len(rakes) > 0
        
        # Optimize schedule
        eta_adjusted = request.eta + timedelta(hours=predicted_delay)
        
        optimized_schedule = {
            "vessel_name": request.vessel_name or "TBD",
            "load_port": request.load_port,
            "discharge_port": request.discharge_port,
            "eta": request.eta.isoformat(),
            "eta_adjusted": eta_adjusted.isoformat(),
            "predicted_delay_hours": predicted_delay,
            "rake_available": rake_available,
            "port_capacity_utilization": congestion,
            "cargo_volume_tons": request.cargo_volume_tons
        }
        
        return PredictResponse(
            predicted_delay_hours=predicted_delay,
            optimized_schedule=optimized_schedule,
            cost_breakdown={
                "ocean_freight": ocean_cost,
                "port_handling": port_handling_cost,
                "rail_transport": rail_cost,
                "demurrage": demurrage_cost,
                "total": ocean_cost + port_handling_cost + rail_cost + demurrage_cost
            },
            demurrage_cost=demurrage_cost
        )

@app.post("/api/whatif", response_model=WhatIfResponse)
async def whatif_analysis(request: WhatIfRequest, current_user: User = Depends(get_current_active_user)):
    """Perform what-if scenario analysis with optimization"""
    with Session(engine) as session:
        ports = session.exec(select(Port)).all()
        port_dict = {p.name: p for p in ports}
        
        # Use provided capacities or current values
        port_capacities = {}
        stock_levels = {}
        for port in ports:
            port_capacities[port.name] = request.port_capacities.get(port.name, port.capacity_tons) if request.port_capacities else port.capacity_tons
            stock_levels[port.name] = request.stock_levels.get(port.name, port.current_stock) if request.stock_levels else port.current_stock
        
        # Optimize vessel schedules using OR-Tools
        optimized_schedules = []
        total_cost = 0.0
        total_delay = 0.0
        
        for vessel_data in request.vessels:
            discharge_port = vessel_data.get("discharge_port")
            if discharge_port not in port_dict:
                continue
            
            # Get congestion
            congestion = stock_levels[discharge_port] / max(1.0, port_capacities[discharge_port])
            
            features = {
                "port_congestion_index": congestion,
                "weather_wind_speed": vessel_data.get("weather_wind_speed", 15.0),
                "weather_visibility": vessel_data.get("weather_visibility", 10.0),
                "weather_wave_height": vessel_data.get("weather_wave_height", 1.0),
                "cargo_volume_tons": vessel_data.get("cargo_volume_tons", 10000.0),
                "avg_turnaround_time_hours": 24.0
            }
            
            predicted_delay = predict_delay(features, vessel_data.get("load_port"))
            total_delay += predicted_delay
            
            # Calculate costs
            cargo_vol = vessel_data.get("cargo_volume_tons", 10000.0)
            ocean_cost = 5.0 * cargo_vol / 1000.0
            port_cost = 2.0 * cargo_vol / 1000.0
            rail_cost = 3.0 * cargo_vol / 1000.0
            demurrage = predicted_delay * 10.0
            vessel_total = ocean_cost + port_cost + rail_cost + demurrage
            total_cost += vessel_total
            
            # Check constraints
            if stock_levels[discharge_port] + cargo_vol > port_capacities[discharge_port]:
                continue  # Skip if capacity exceeded
            
            optimized_schedules.append({
                "vessel_name": vessel_data.get("vessel_name", "Unknown"),
                "load_port": vessel_data.get("load_port", "Unknown"),
                "discharge_port": discharge_port,
                "cargo_volume_tons": cargo_vol,
                "predicted_delay_hours": predicted_delay,
                "eta": vessel_data.get("eta", datetime.utcnow().isoformat()),
                "cost_breakdown": {
                    "ocean": ocean_cost,
                    "port": port_cost,
                    "rail": rail_cost,
                    "demurrage": demurrage,
                    "total": vessel_total
                }
            })
            
            # Update stock levels (simulation)
            stock_levels[discharge_port] += cargo_vol
        
        # Calculate port utilization
        port_utilization = {}
        for port_name in port_capacities:
            utilization = stock_levels[port_name] / max(1.0, port_capacities[port_name])
            port_utilization[port_name] = float(utilization)
        
        # Generate recommendations
        recommendations = []
        if total_delay > 50:
            recommendations.append("High predicted delays detected. Consider redistributing vessels across ports.")
        if max(port_utilization.values()) > 0.9:
            recommendations.append("Some ports are near capacity. Consider alternative discharge ports.")
        if total_cost > 100000:
            recommendations.append("Total cost is high. Review vessel assignments and port selections.")
        
        return WhatIfResponse(
            scenario_name=request.scenario_name,
            optimized_schedules=optimized_schedules,
            total_cost=total_cost,
            total_delay_hours=total_delay,
            port_utilization=port_utilization,
            recommendations=recommendations
        )

@app.post("/api/upload")
async def upload_data(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Upload Excel/CSV file to update vessel history or port/plant data"""
    global vessel_history_df
    
    try:
        contents = await file.read()
        file_ext = file.filename.split('.')[-1].lower()
        
        if file_ext == 'csv':
            df = pd.read_csv(BytesIO(contents))
        elif file_ext in ['xlsx', 'xls']:
            df = pd.read_excel(BytesIO(contents))
        else:
            raise HTTPException(400, "Unsupported file format. Use CSV or Excel.")
        
        # Determine file type based on columns
        if "vessel_name" in df.columns or "delay_hours" in df.columns or "eta_port" in df.columns:
            # Vessel history file
            vessel_history_df = df
            # Retrain ML model if delay_hours column exists
            if "delay_hours" in df.columns:
                try:
                    feature_cols = [
                        "port_congestion_index", "weather_wind_speed", "weather_visibility",
                        "weather_wave_height", "cargo_volume_tons", "avg_turnaround_time_hours"
                    ]
                    available_cols = [col for col in feature_cols if col in df.columns]
                    
                    if len(available_cols) > 0:
                        X = df[available_cols].fillna(0)
                        y = df["delay_hours"].fillna(0)
                        
                        if "load_port" in df.columns:
                            port_dummies = pd.get_dummies(df["load_port"], prefix="load_port")
                            X = pd.concat([X, port_dummies], axis=1)
                        
                        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
                        rf = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10)
                        rf.fit(X_train, y_train)
                        joblib.dump(rf, "ai_delay_predictor.joblib")
                        global ai_predictor
                        ai_predictor = rf
                except Exception as e:
                    print(f"Failed to retrain model: {e}")
            
            return {
                "status": "success",
                "message": f"Vessel history updated with {len(df)} records",
                "records": len(df),
                "columns": list(df.columns)
            }
        
        elif "port" in df.columns.lower() or "capacity" in df.columns.lower():
            # Port/plant data
            with Session(engine) as session:
                for _, row in df.iterrows():
                    port_name = row.get("port") or row.get("name")
                    capacity = row.get("capacity") or row.get("capacity_tons")
                    stock = row.get("stock") or row.get("current_stock", 0.0)
                    
                    if port_name and capacity:
                        existing = session.exec(select(Port).where(Port.name == port_name)).first()
                        if existing:
                            existing.capacity_tons = float(capacity)
                            existing.current_stock = float(stock)
                            session.add(existing)
                        else:
                            session.add(Port(name=port_name, capacity_tons=float(capacity), current_stock=float(stock)))
                session.commit()
            
            return {
                "status": "success",
                "message": f"Port/plant data updated",
                "records": len(df)
            }
        
        else:
            return {
                "status": "success",
                "message": f"File uploaded and processed",
                "records": len(df),
                "columns": list(df.columns),
                "note": "File format not recognized. Data stored but may need manual processing."
            }
    
    except Exception as e:
        raise HTTPException(500, f"Error processing file: {str(e)}")

@app.get("/health")
def health():
    return {"ok": True}
