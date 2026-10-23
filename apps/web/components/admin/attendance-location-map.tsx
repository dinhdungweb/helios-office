"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Circle, CircleMarker, LayerGroup, Map as LeafletMap } from "leaflet";

// OpenStreetMap through Leaflet (DV-07): shows GPS check-in places with their radius and, when
// `onPick` is given, sets the point where the map is clicked. Leaflet touches `window`, so it is
// loaded in the browser only.

export type MapPoint = { id: string; latitude: number; longitude: number; radiusMeters: number; label: string; active: boolean };

type Props = {
  points: MapPoint[];
  // The point being edited, drawn in the accent colour.
  value?: { latitude: number; longitude: number; radiusMeters: number } | null;
  onPick?: (latitude: number, longitude: number) => void;
  height?: number;
  label: string;
};

const HANOI: [number, number] = [21.0285, 105.8542];
const ACCENT = "#2563eb";
const MUTED = "#64748b";

export function AttendanceLocationMap({ points, value, onPick, height = 320, label }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const editRef = useRef<{ circle: Circle; dot: CircleMarker } | null>(null);
  const pickRef = useRef(onPick);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  useEffect(() => {
    pickRef.current = onPick;
  }, [onPick]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true }).setView(HANOI, 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
      }).addTo(map);
      map.on("click", (event) => pickRef.current?.(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6))));
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      editRef.current = null;
    };
  }, []);

  // Draw the saved places and the edited point; fit the view to what is shown.
  useEffect(() => {
    const draw = () => {
      const L = leafletRef.current;
      const map = mapRef.current;
      const layer = layerRef.current;
      if (!L || !map || !layer) return;
      layer.clearLayers();
      editRef.current = null;
      const bounds: Array<[number, number]> = [];
      for (const point of points) {
        const color = point.active ? MUTED : "#94a3b8";
        L.circle([point.latitude, point.longitude], { radius: point.radiusMeters, color, weight: 1, fillOpacity: 0.08, dashArray: point.active ? undefined : "4 4" }).addTo(layer);
        L.circleMarker([point.latitude, point.longitude], { radius: 5, color: "#ffffff", weight: 2, fillColor: color, fillOpacity: 1 })
          .bindTooltip(point.label, { direction: "top", offset: [0, -6] })
          .addTo(layer);
        bounds.push([point.latitude, point.longitude]);
      }
      if (value) {
        const circle = L.circle([value.latitude, value.longitude], { radius: value.radiusMeters, color: ACCENT, weight: 2, fillOpacity: 0.15 }).addTo(layer);
        const dot = L.circleMarker([value.latitude, value.longitude], { radius: 7, color: "#ffffff", weight: 2, fillColor: ACCENT, fillOpacity: 1 }).addTo(layer);
        editRef.current = { circle, dot };
      }
      if (value) {
        map.fitBounds(L.latLng(value.latitude, value.longitude).toBounds(value.radiusMeters * 4), { maxZoom: 17 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 16);
      } else if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 16 });
      }
    };
    if (mapRef.current) draw();
    else {
      // The map is still loading: draw once it is ready.
      const timer = setInterval(() => {
        if (mapRef.current) {
          clearInterval(timer);
          draw();
        }
      }, 100);
      return () => clearInterval(timer);
    }
    // value is compared by its parts so typing in the radius box does not refit for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, value?.latitude, value?.longitude]);

  // A radius change only resizes the circle.
  useEffect(() => {
    if (value && editRef.current) editRef.current.circle.setRadius(value.radiusMeters);
  }, [value]);

  return <div aria-label={label} className={onPick ? "location-map is-editable" : "location-map"} ref={containerRef} role="application" style={{ height }} />;
}
