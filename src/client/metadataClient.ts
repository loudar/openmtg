import type {Symbology} from "../models/Symbology.ts";
import {api} from "./api.ts";

export async function getSymbology() {
    const {data} = await api.post<Symbology[]>(`/api/symbology`);
    return data;
}