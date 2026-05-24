import "./skeleton.scss";

export function SkeletonBox({ className = "" }) {
  return <div className={`skeleton-box ${className}`} />;
}

export function StatSkeleton({ count = 4 }) {
  return (
    <div className="skeleton-stat-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-stat card" key={index}>
          <SkeletonBox className="skeleton-icon" />
          <div>
            <SkeletonBox className="skeleton-line short" />
            <SkeletonBox className="skeleton-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 6 }) {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          className="skeleton-table-row"
          key={rowIndex}
          style={{ "--skeleton-columns": columns }}
        >
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <SkeletonBox
              className={columnIndex % 2 ? "skeleton-line short" : "skeleton-line"}
              key={columnIndex}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="skeleton-list-row" key={index}>
          <SkeletonBox className="skeleton-icon" />
          <div>
            <SkeletonBox className="skeleton-line" />
            <SkeletonBox className="skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="skeleton-chart">
      <SkeletonBox className="skeleton-chart-main" />
      <div className="skeleton-chart-axis">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBox className="skeleton-line short" key={index} />
        ))}
      </div>
    </div>
  );
}
