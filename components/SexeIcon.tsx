export default function SexeIcon({ sexe, size = 22 }: { sexe: 'homme' | 'femme'; size?: number }) {
  const c = sexe === 'femme' ? '#f472b6' : '#38bdf8';
  return (
    <span style={{ width:size, height:size, borderRadius:'50%', background:`${c}22`, border:`1.5px solid ${c}`, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <svg width={size*0.62} height={size*0.62} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        {sexe === 'femme'
          ? <><circle cx="12" cy="9" r="5.5"/><path d="M12 14.5V22M8.5 18.5h7"/></>
          : <><circle cx="10" cy="14" r="5.5"/><path d="M14 10l7-7M15 3h6v6"/></>}
      </svg>
    </span>
  );
}
