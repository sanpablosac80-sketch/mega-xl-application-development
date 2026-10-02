export function MegaMascot({ className = 'size-12' }: { className?: string }) {
  return <svg viewBox="0 0 120 140" className={className} role="img" aria-label="Asistente Mega XL">
    <ellipse cx="60" cy="25" rx="39" ry="18" fill="#fff" stroke="#164e8a" strokeWidth="5"/><ellipse cx="60" cy="25" rx="13" ry="7" fill="#dbeafe" stroke="#164e8a" strokeWidth="4"/>
    <path d="M21 25v72c0 12 17 21 39 21s39-9 39-21V25" fill="#fff" stroke="#164e8a" strokeWidth="5"/>
    <circle cx="47" cy="54" r="5" fill="#164e8a"/><circle cx="73" cy="54" r="5" fill="#164e8a"/><path d="M48 67q12 12 24 0" fill="none" stroke="#164e8a" strokeWidth="4" strokeLinecap="round"/>
    <text x="60" y="91" textAnchor="middle" fontSize="16" fontWeight="900" fill="#1671cf">MEGA</text><text x="60" y="108" textAnchor="middle" fontSize="20" fontWeight="900" fill="#f5a000">XL</text>
    <path d="M22 62L7 78M98 62l15 16M43 116l-8 18M77 116l8 18" stroke="#164e8a" strokeWidth="6" strokeLinecap="round"/>
  </svg>
}
