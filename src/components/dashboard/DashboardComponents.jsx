import { TrendingUp, TrendingDown } from 'lucide-react';

export function StatCard({ icon: Icon, label, value, trend, trendValue, onClick, style }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid rgba(10, 42, 67, 0.1)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(10, 42, 67, 0.1)';
          e.currentTarget.style.transform = 'translateY(-4px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(41, 98, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2962ff',
          }}
        >
          {Icon && <Icon size={24} />}
        </div>
        {trend && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              background: trend === 'up' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
              color: trend === 'up' ? '#4caf50' : '#f44336',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trendValue}
          </div>
        )}
      </div>
      <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: '500' }}>
        {label}
      </p>
      <p style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: '#0a2a43' }}>
        {value}
      </p>
    </div>
  );
}

export function Card({ children, style, ...props }) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid rgba(10, 42, 67, 0.1)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, style, ...props }) {
  return (
    <div
      style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(10, 42, 67, 0.08)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, style, ...props }) {
  return (
    <div
      style={{
        padding: '24px',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, style, ...props }) {
  return (
    <h2
      style={{
        margin: '0 0 20px 0',
        fontSize: '18px',
        fontWeight: '700',
        color: '#0a2a43',
        ...style,
      }}
      {...props}
    >
      {children}
    </h2>
  );
}

export function Badge({ children, variant = 'default', style, ...props }) {
  const variants = {
    default: {
      background: 'rgba(41, 98, 255, 0.1)',
      color: '#2962ff',
    },
    success: {
      background: 'rgba(76, 175, 80, 0.1)',
      color: '#4caf50',
    },
    warning: {
      background: 'rgba(255, 152, 0, 0.1)',
      color: '#ff9800',
    },
    danger: {
      background: 'rgba(244, 67, 54, 0.1)',
      color: '#f44336',
    },
    secondary: {
      background: 'rgba(158, 158, 158, 0.1)',
      color: '#9e9e9e',
    },
  };

  const variantStyle = variants[variant] || variants.default;

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        ...variantStyle,
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}

export function Button({ children, variant = 'primary', size = 'md', style, ...props }) {
  const sizeStyles = {
    sm: { padding: '8px 16px', fontSize: '12px' },
    md: { padding: '12px 24px', fontSize: '14px' },
    lg: { padding: '16px 32px', fontSize: '16px' },
  };

  const variants = {
    primary: {
      background: '#2962ff',
      color: 'white',
      border: 'none',
    },
    secondary: {
      background: 'rgba(10, 42, 67, 0.1)',
      color: '#0a2a43',
      border: '1px solid rgba(10, 42, 67, 0.2)',
    },
    outline: {
      background: 'transparent',
      color: '#2962ff',
      border: '1px solid #2962ff',
    },
    danger: {
      background: '#f44336',
      color: 'white',
      border: 'none',
    },
  };

  const variantStyle = variants[variant] || variants.primary;
  const sizeStyle = sizeStyles[size] || sizeStyles.md;

  return (
    <button
      style={{
        borderRadius: '8px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        ...variantStyle,
        ...sizeStyle,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.85';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function EmptyState({ icon: Icon, title, description, action, style }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
        ...style,
      }}
    >
      {Icon && (
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '16px',
            background: 'rgba(41, 98, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2962ff',
            marginBottom: '20px',
          }}
        >
          <Icon size={40} />
        </div>
      )}
      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#0a2a43' }}>
        {title}
      </h3>
      <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#666', maxWidth: '300px' }}>
        {description}
      </p>
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
}
