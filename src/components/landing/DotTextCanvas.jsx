import { useEffect, useRef } from "react";

export default function DotSwarmCanvas({
  color = "rgb(0, 58, 22)",  
  dotColor = "rgb(0, 58, 22)",
  particleCount = 50 
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext("2d");

    let particles = [];
    let animationFrameId;

    class Particle {
      constructor(width, height) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        // Velocity: how fast they move
        this.vx = (Math.random() - 0.5) * 0.8; 
        this.vy = (Math.random() - 0.5) * 0.8;
        this.radius = Math.random() * 2 + 1;
      }

      update(width, height) {
        // Move particle
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      }
    }

    const init = () => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      particles = [];
      // Adjust density based on screen size
      const count = Math.floor((canvas.width * canvas.height) / 15000); 
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
    };

    const drawLines = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Only draw line if particles are close
          if (distance < 150) {
            ctx.beginPath();
            // Fade line based on distance
            ctx.strokeStyle = `rgba(0, 58, 22, ${1 - distance / 150})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.closePath();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p) => {
        p.update(canvas.width, canvas.height);
        p.draw();
      });

      drawLines();
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", init);
    init();
    animate();

    return () => {
      window.removeEventListener("resize", init);
      cancelAnimationFrame(animationFrameId);
    };
  }, [dotColor]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', background: 'transparent' }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}