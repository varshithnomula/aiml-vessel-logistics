```jsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";


export default function ProtectedRoutes({ children }) {
const router = useRouter();


useEffect(() => {
const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
if (!token) router.push("/login");
}, [router]);


return <>{children}</>;
}
```