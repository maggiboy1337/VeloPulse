import { useEffect, useRef } from 'react';
import './ElevationProfile.css';

interface RoutePoint {
  latitude: number;
  longitude: number;
  elevationMeters?: number;
}

interface ElevationProfileProps {
  routePoints: RoutePoint[];
  currentIndex: number;
  displayName: string;
}

export function ElevationProfile({ routePoints, currentIndex, displayName }: ElevationProfileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    console.log('ElevationProfile update:', { currentIndex, totalPoints: routePoints.length, displayName });

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Filter points with elevation data
    const pointsWithElevation = routePoints.filter(p => p.elevationMeters != null);
    
    if (pointsWithElevation.length < 2) {
      // Show message if no elevation data
      ctx.fillStyle = '#64748b';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Keine Höhendaten verfügbar', width / 2, height / 2);
      return;
    }

    // Calculate elevation range
    const elevations = pointsWithElevation.map(p => p.elevationMeters!);
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    const elevationRange = maxElevation - minElevation;
    const elevationPadding = elevationRange * 0.1; // 10% padding

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      // Draw elevation labels
      const elevation = maxElevation + elevationPadding - (elevationRange + 2 * elevationPadding) * (i / gridLines);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(elevation.toFixed(0) + 'm', padding.left - 10, y + 4);
    }

    // Draw elevation profile
    ctx.strokeStyle = '#06b6d4';
    ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);

    pointsWithElevation.forEach((point, index) => {
      const x = padding.left + (index / (pointsWithElevation.length - 1)) * chartWidth;
      const normalizedElevation = (point.elevationMeters! - minElevation + elevationPadding) / (elevationRange + 2 * elevationPadding);
      const y = padding.top + chartHeight - normalizedElevation * chartHeight;
      
      if (index === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.lineTo(padding.left + chartWidth, height - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Draw line
    ctx.beginPath();
    pointsWithElevation.forEach((point, index) => {
      const x = padding.left + (index / (pointsWithElevation.length - 1)) * chartWidth;
      const normalizedElevation = (point.elevationMeters! - minElevation + elevationPadding) / (elevationRange + 2 * elevationPadding);
      const y = padding.top + chartHeight - normalizedElevation * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw current position marker
    if (currentIndex >= 0 && currentIndex < routePoints.length) {
      const currentPoint = routePoints[currentIndex];
      if (currentPoint.elevationMeters != null) {
        // Find the index in pointsWithElevation
        let elevationIndex = 0;
        for (let i = 0; i <= currentIndex; i++) {
          if (routePoints[i].elevationMeters != null) {
            elevationIndex++;
          }
        }
        elevationIndex--;

        if (elevationIndex >= 0 && elevationIndex < pointsWithElevation.length) {
          const x = padding.left + (elevationIndex / (pointsWithElevation.length - 1)) * chartWidth;
          const normalizedElevation = (currentPoint.elevationMeters - minElevation + elevationPadding) / (elevationRange + 2 * elevationPadding);
          const y = padding.top + chartHeight - normalizedElevation * chartHeight;

          // Draw vertical line
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(x, padding.top);
          ctx.lineTo(x, height - padding.bottom);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw circle
          ctx.fillStyle = '#8b5cf6';
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw elevation value
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 14px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(currentPoint.elevationMeters.toFixed(0) + 'm', x, y - 15);
        }
      }
    }

    // Draw x-axis label
    ctx.fillStyle = '#64748b';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Streckenverlauf', width / 2, height - 5);

    // Draw title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`Höhenprofil - ${displayName}`, padding.left, 15);

  }, [routePoints, currentIndex, displayName]);

  return (
    <div className="elevation-profile">
      <canvas ref={canvasRef} />
    </div>
  );
}
