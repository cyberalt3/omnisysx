// ----- Interactive star-mascot background (subtle, sides only) -----
function InteractiveBackground(){
  const ref = useRef(null);
  const mouse = useRef({x: 0.5, y: 0.5, tx: 0.5, ty: 0.5});
  const scrollY = useRef(0);

  useEffect(()=>{
    const onMove = (e) => {
      mouse.current.tx = e.clientX / window.innerWidth;
      mouse.current.ty = e.clientY / window.innerHeight;
    };
    const onScroll = () => { scrollY.current = window.scrollY; };
    window.addEventListener("mousemove", onMove, {passive:true});
    window.addEventListener("scroll", onScroll, {passive:true});

    let raf;
    const tick = () => {
      mouse.current.x += (mouse.current.tx - mouse.current.x) * 0.06;
      mouse.current.y += (mouse.current.ty - mouse.current.y) * 0.06;
      const el = ref.current;
      if(el){
        const dx = (mouse.current.x - 0.5) * 2;
        const dy = (mouse.current.y - 0.5) * 2;
        const sy = scrollY.current;
        const shapes = el.querySelectorAll("[data-shape]");
        shapes.forEach((s) => {
          const depth = parseFloat(s.dataset.depth || "1");
          const rot = parseFloat(s.dataset.rot || "0");
          const tx = dx * 36 * depth;
          const ty = dy * 36 * depth - sy * 0.05 * depth;
          const r = rot + dx * 5 * depth;
          s.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${r}deg)`;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return ()=>{
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  },[]);

  // OmnisysX-mascot-style star path
  const starPath = "M50 4 C52 24 64 36 84 38 C66 44 56 56 50 80 C44 56 34 44 16 38 C36 36 48 24 50 4 Z";

  // Stars only on the sides — far enough from center that content stays clean
  const shapes = [
    // Right side cluster
    { x:"82%", y:"-6%",  size:480, hue:225, alpha:0.22, rot:-18, depth:1.3, blur:0 },
    { x:"86%", y:"4%",   size:380, hue:215, alpha:0.18, rot:14,  depth:1.1, blur:1 },
    { x:"90%", y:"14%",  size:300, hue:205, alpha:0.14, rot:32,  depth:0.9, blur:2 },
    // Left side cluster
    { x:"-12%",y:"50%",  size:520, hue:230, alpha:0.18, rot:22,  depth:1.0, blur:2 },
    { x:"-6%", y:"60%",  size:380, hue:220, alpha:0.14, rot:-8,  depth:0.8, blur:3 },
    // Far right lower
    { x:"88%", y:"70%",  size:420, hue:218, alpha:0.16, rot:-26, depth:0.9, blur:2 },
    // Left upper
    { x:"-8%", y:"8%",   size:340, hue:222, alpha:0.12, rot:40,  depth:0.7, blur:3 },
  ];

  return (
    <div ref={ref} aria-hidden style={{
      position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
      overflow:"hidden",
      background:"radial-gradient(120% 80% at 50% 0%, #0a1430 0%, #050a1c 45%, #02040b 75%, #000 100%)",
    }}>
      {/* Soft hero glow that gently follows the cursor */}
      <div data-shape="1" data-depth="0.4" data-rot="0" style={{
        position:"absolute", left:"50%", top:"-10%", width:900, height:900, marginLeft:-450,
        background:"radial-gradient(circle, rgba(91,158,255,0.16) 0%, rgba(41,98,239,0.07) 35%, transparent 70%)",
        filter:"blur(20px)",
        willChange:"transform",
      }}/>

      {shapes.map((s, i) => (
        <div key={i}
          data-shape="1"
          data-depth={s.depth}
          data-rot={s.rot}
          style={{
            position:"absolute",
            left:s.x, top:s.y,
            width:s.size, height:s.size,
            transform:`rotate(${s.rot}deg)`,
            willChange:"transform",
            filter: s.blur ? `blur(${s.blur}px)` : undefined,
          }}>
          <svg viewBox="0 0 100 100" width="100%" height="100%" style={{display:"block", overflow:"visible"}}>
            <defs>
              <radialGradient id={`sg${i}`} cx="50%" cy="40%" r="60%">
                <stop offset="0%"  stopColor={`hsla(${s.hue}, 90%, 72%, ${s.alpha})`}/>
                <stop offset="55%" stopColor={`hsla(${s.hue}, 85%, 55%, ${s.alpha*0.6})`}/>
                <stop offset="100%" stopColor={`hsla(${s.hue}, 80%, 35%, 0)`}/>
              </radialGradient>
            </defs>
            <path d={starPath} fill={`url(#sg${i})`}/>
          </svg>
        </div>
      ))}

      {/* Soft vignette to keep center readable */}
      <div style={{
        position:"absolute", inset:0,
        background:"radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)",
      }}/>
    </div>
  );
}

Object.assign(window, { InteractiveBackground });
