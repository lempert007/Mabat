/** Slow-moving light field behind the login card. Pure CSS, no assets. */
export function LoginBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute -top-1/3 -left-1/4 h-[80vh] w-[80vh] rounded-full opacity-40 blur-3xl"
        style={{
          background: 'radial-gradient(circle at center, rgba(91,156,255,0.55), transparent 60%)',
          animation: 'drift-a 26s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute -bottom-1/3 -right-1/4 h-[90vh] w-[90vh] rounded-full opacity-30 blur-3xl"
        style={{
          background: 'radial-gradient(circle at center, rgba(139,156,255,0.5), transparent 60%)',
          animation: 'drift-b 32s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      <style>{`
        @keyframes drift-a { from { transform: translate(0,0) scale(1);} to { transform: translate(12vw, 8vh) scale(1.15);} }
        @keyframes drift-b { from { transform: translate(0,0) scale(1.1);} to { transform: translate(-10vw, -10vh) scale(0.95);} }
      `}</style>
    </div>
  );
}
