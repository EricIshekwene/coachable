import { useRef, useState } from "react";

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const DEFAULT_CAMERA = { x: 0, y: 0, zoom: 1 };

export function useFieldViewport() {
  const [camera, setCamera] = useState(DEFAULT_CAMERA);
  const [fieldRotation, setFieldRotation] = useState(0);
  const [fieldHistoryPast, setFieldHistoryPast] = useState([]);
  const [fieldHistoryFuture, setFieldHistoryFuture] = useState([]);
  const isFieldRestoringRef = useRef(false);

  const snapshotField = () => ({
    camera: { ...camera },
    fieldRotation,
  });

  const applyField = (snapshot) => {
    if (!snapshot) return;
    isFieldRestoringRef.current = true;
    setCamera(snapshot.camera || DEFAULT_CAMERA);
    setFieldRotation(snapshot.fieldRotation ?? 0);
    isFieldRestoringRef.current = false;
  };

  const pushFieldHistory = () => {
    if (isFieldRestoringRef.current) return;
    setFieldHistoryPast((prev) => [...prev, snapshotField()]);
    setFieldHistoryFuture([]);
  };

  const zoomPercent = clamp(Math.round((camera.zoom || 1) * 100), 30, 300);

  const setZoomPercent = (nextPercent) => {
    const pct = clamp(Number(nextPercent) || 0, 30, 300);
    const nextZoom = pct / 100;
    if (Math.abs((camera.zoom || 1) - nextZoom) < 0.0001) return;
    pushFieldHistory();
    setCamera((prev) => ({ ...prev, zoom: nextZoom }));
  };

  const zoomIn = () => setZoomPercent(zoomPercent + 5);
  const zoomOut = () => setZoomPercent(zoomPercent - 5);

  const onRotateLeft = () => {
    if (fieldRotation === -90) return;
    pushFieldHistory();
    setFieldRotation(-90);
  };

  const onRotateCenter = () => {
    if (fieldRotation === 180) return;
    pushFieldHistory();
    setFieldRotation(180);
  };

  const onRotateRight = () => {
    if (fieldRotation === 90) return;
    pushFieldHistory();
    setFieldRotation(90);
  };

  const onFieldUndo = () => {
    setFieldHistoryPast((prev) => {
      if (prev.length === 0) return prev;
      const nextPast = prev.slice(0, -1);
      const previous = prev[prev.length - 1];
      setFieldHistoryFuture((future) => [...future, snapshotField()]);
      applyField(previous);
      return nextPast;
    });
  };

  const onFieldRedo = () => {
    setFieldHistoryFuture((prev) => {
      if (prev.length === 0) return prev;
      const nextFuture = prev.slice(0, -1);
      const next = prev[prev.length - 1];
      setFieldHistoryPast((past) => [...past, snapshotField()]);
      applyField(next);
      return nextFuture;
    });
  };

  const clearFieldHistory = () => {
    setFieldHistoryPast([]);
    setFieldHistoryFuture([]);
  };

  const resetFieldViewport = () => {
    isFieldRestoringRef.current = true;
    setCamera(DEFAULT_CAMERA);
    setFieldRotation(0);
    setFieldHistoryPast([]);
    setFieldHistoryFuture([]);
    isFieldRestoringRef.current = false;
  };

  const loadFieldViewport = ({ nextCamera, nextFieldRotation }) => {
    isFieldRestoringRef.current = true;
    setCamera(nextCamera || DEFAULT_CAMERA);
    setFieldRotation(nextFieldRotation ?? 0);
    setFieldHistoryPast([]);
    setFieldHistoryFuture([]);
    isFieldRestoringRef.current = false;
  };

  return {
    camera,
    setCamera,
    fieldRotation,
    zoomPercent,
    setZoomPercent,
    zoomIn,
    zoomOut,
    onRotateLeft,
    onRotateCenter,
    onRotateRight,
    onFieldUndo,
    onFieldRedo,
    pushFieldHistory,
    snapshotField,
    applyField,
    clearFieldHistory,
    resetFieldViewport,
    loadFieldViewport,
    isFieldRestoringRef,
  };
}

export default useFieldViewport;
