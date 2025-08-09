import axios from "axios";

export const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "http://localhost:3000";

export const api = axios.create({
    baseURL: API_BASE,
    headers: {"content-type": "application/json"},
    withCredentials: false,
});