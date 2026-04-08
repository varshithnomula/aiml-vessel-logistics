# AI-Enabled Logistics Optimizer for Cost-Optimal Vessel Scheduling

A full-stack web application for optimizing vessel scheduling and port-plant linkage in steel supply chain logistics using AI/ML predictions and OR-Tools optimization.

## Features

- **JWT Authentication**: Secure login system for logistics managers
- **Data Upload**: Upload Excel/CSV files (vessel history, port data, plant requirements)
- **AI/ML Delay Prediction**: Predicts pre-berthing delays using scikit-learn Random Forest model
- **OR-Tools Optimization**: Optimizes vessel scheduling considering:
  - Port and plant-specific stock capacities
  - Sequential discharge constraints (Haldia always second)
  - Railway rake availability
  - Maximum port calls per vessel
  - Vessel arrival times and stock age constraints
- **What-If Analysis**: Simulate alternative scenarios dynamically
- **Dashboard**: Real-time overview with charts and statistics
- **Reporting**: Export results as Excel or PDF

## Tech Stack

### Backend
- **FastAPI**: Python web framework
- **SQLModel**: Database ORM
- **OR-Tools**: Optimization engine
- **scikit-learn**: ML model for delay prediction
- **pandas**: Data processing
- **JWT**: Authentication

### Frontend
- **Next.js 14**: React framework
- **Tailwind CSS**: Styling
- **Recharts**: Data visualization
- **Leaflet**: Maps (for route visualization)
- **Axios**: API client

## Installation

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r ../requirements.txt
```

4. Run the FastAPI server:
```bash
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd Vessel-Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file (optional, defaults to localhost:8000):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

### Login

Default credentials:
- **Admin**: `admin` / `adminpass`
- **Plant Manager**: `plant1` / `plantpass`
- **Supplier**: `supplier1` / `supplierpass`

### Upload Data

1. Navigate to **Upload Data** page
2. Upload Excel (.xlsx, .xls) or CSV files containing:
   - **Vessel History**: Columns like `vessel_name`, `delay_hours`, `port_congestion_index`, `weather_wind_speed`, `cargo_volume_tons`, etc.
   - **Port Data**: Columns like `port`/`name`, `capacity`/`capacity_tons`, `stock`/`current_stock`

The system automatically detects file type based on column names and retrains the ML model if vessel history is uploaded.

### Dashboard Overview

View summary statistics:
- Total vessels tracked
- Average delay hours
- Active ports
- Total cargo (tons)
- Port congestion trends
- Delay hours by port

### AI Delay Prediction

1. Navigate to **AI Delay Prediction** (or use the predict endpoint)
2. Enter vessel details:
   - Vessel name, type, load port, discharge port
   - Cargo type and volume
   - ETA
   - Weather conditions (optional)
3. Click "Predict Delay & Optimize"
4. View predicted delay, cost breakdown, and optimized schedule

### Scenario Simulation (What-If Analysis)

1. Navigate to **Scenario Simulation**
2. Create a scenario with multiple vessels
3. Configure vessel details (ports, cargo, dates)
4. Run what-if analysis
5. View optimized schedules, costs, port utilization, and recommendations

### API Endpoints

#### Overview
```
GET /api/overview
```
Returns summary statistics for dashboard.

#### Predict
```
POST /api/predict
Body: {
  "vessel_name": "MV Example",
  "vessel_type": "Bulk",
  "load_port": "Kolkata",
  "discharge_port": "Paradip",
  "cargo_type": "Iron Ore",
  "cargo_volume_tons": 15000,
  "eta": "2024-01-15T10:00:00",
  "weather_wind_speed": 15.0,
  "weather_visibility": 10.0,
  "weather_wave_height": 1.0
}
```

#### What-If Analysis
```
POST /api/whatif
Body: {
  "scenario_name": "Scenario 1",
  "vessels": [
    {
      "vessel_name": "MV Test",
      "load_port": "Kolkata",
      "discharge_port": "Paradip",
      "cargo_volume_tons": 15000,
      "eta": "2024-01-15",
      ...
    }
  ]
}
```

#### Upload
```
POST /api/upload
Content-Type: multipart/form-data
Body: file (Excel/CSV)
```

## Data Format

### Vessel History CSV

Required columns:
- `vessel_name`: Vessel identifier
- `delay_hours`: Target variable for ML training
- `port_congestion_index`: Port congestion (0-1)
- `weather_wind_speed`: Wind speed in knots
- `weather_visibility`: Visibility in km
- `weather_wave_height`: Wave height in meters
- `cargo_volume_tons`: Cargo volume
- `load_port`: Loading port name
- `discharge_port`: Discharge port name

Optional columns:
- `eta_port`: Estimated time of arrival
- `ata_port`: Actual time of arrival
- `vessel_type`: Type of vessel
- `avg_turnaround_time_hours`: Average turnaround time

### Port Data CSV

Required columns:
- `port` or `name`: Port name
- `capacity` or `capacity_tons`: Port capacity in tons
- `stock` or `current_stock`: Current stock level (optional)

## Optimization Constraints

The optimization engine considers:

1. **Port Capacity**: Vessel cargo + current stock ≤ port capacity
2. **Sequential Discharge**: Haldia must always be the second port if called
3. **Rake Availability**: Railway rake must be available at discharge port
4. **Maximum Port Calls**: Configurable limit per vessel (default: 3)
5. **Stock Age**: Constraints on stock age at ports

## ML Model

The system uses a Random Forest Regressor trained on historical vessel data to predict pre-berthing delays. Features include:
- Port congestion index
- Weather conditions (wind, visibility, wave height)
- Cargo volume
- Port characteristics
- Historical patterns

The model is automatically retrained when new vessel history data is uploaded.

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI application
│   └── data/                 # Data directory
│       └── vessel_history.csv
├── Vessel-Frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/   # Dashboard pages
│   │   │   └── page.jsx     # Login page
│   │   ├── components/      # React components
│   │   └── utils/           # Utilities (API, auth)
│   └── package.json
├── requirements.txt         # Python dependencies
└── README.md
```

## Development

### Backend Development

The backend uses SQLite for data storage. The database file (`backend.db`) is created automatically on first run.

To reset the database, delete `backend.db` and restart the server.

### Frontend Development

The frontend uses Next.js App Router. Pages are in `src/app/` and components in `src/components/`.

## Troubleshooting

### Backend Issues

1. **Port already in use**: Change the port in the uvicorn command
2. **Missing dependencies**: Ensure all packages in `requirements.txt` are installed
3. **Database errors**: Delete `backend.db` and restart

### Frontend Issues

1. **API connection errors**: Check `NEXT_PUBLIC_API_URL` in `.env.local`
2. **Authentication errors**: Clear localStorage and login again
3. **Build errors**: Delete `node_modules` and `.next`, then reinstall

## License

This project is developed for the Smart India Hackathon (SIH) competition.

## Contact

For issues or questions, please refer to the project documentation or contact the development team.

