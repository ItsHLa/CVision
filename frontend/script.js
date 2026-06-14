// ── Particle Canvas ──
const canvas = document.getElementById('particleCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.speedY = (Math.random() - 0.5) * 0.4;
      this.opacity = Math.random() * 0.4 + 0.1;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(96, 165, 250, ${this.opacity})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < 80; i++) particles.push(new Particle());

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(96, 165, 250, ${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(animate);
  }
  animate();
}

// ── Hero Heading Character Animation ──
const heroHeading = document.getElementById('heroHeading');
if (heroHeading) {
  const rawText = heroHeading.getAttribute('data-heading') || heroHeading.textContent || '';
  const lines = rawText.split('|');
  heroHeading.innerHTML = '';
  
  let charTotal = 0;
  lines.forEach((line, li) => {
    const words = line.trim().split(/\s+/);
    words.forEach((word, wi) => {
      word.split('').forEach(char => {
        const span = document.createElement('span');
        span.className = 'char';
        span.textContent = char;
        span.style.animationDelay = `${0.6 + (charTotal * 0.02)}s`;
        heroHeading.appendChild(span);
        charTotal++;
      });
      if (wi < words.length - 1) {
        const space = document.createElement('span');
        space.className = 'char space';
        space.innerHTML = '&nbsp;';
        space.style.animationDelay = `${0.6 + (charTotal * 0.02)}s`;
        heroHeading.appendChild(space);
        charTotal++;
      }
    });
    if (li < lines.length - 1) {
      heroHeading.appendChild(document.createElement('br'));
    }
  });
}

// ── Mockup Chat Demo ──
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');

if (chatMessages && chatInput) {
  const initialMessages = Array.from(chatMessages.querySelectorAll('.msg'));
  const messageData = initialMessages.map(msg => {
    const p = msg.querySelector('p');
    const text = p ? p.textContent.trim() : '';
    if (p) p.textContent = '';
    msg.style.opacity = '0';
    msg.style.transform = 'translateY(10px)';
    msg.style.animation = 'none';
    return { element: msg, textElement: p, fullText: text };
  });

  let msgIndex = 0;
  function showNextMessage() {
    if (msgIndex >= messageData.length) return;
    const { element, textElement, fullText } = messageData[msgIndex];
    const isUser = element.classList.contains('user');

    element.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';

    if (isUser) {
      // Keep bubble hidden while text types in the input
      // Type the message into the input field first
      let i = 0;
      const typeInInput = () => {
        if (i < fullText.length) {
          chatInput.value += fullText[i++];
          setTimeout(typeInInput, 40 + Math.random() * 30);
        } else {
          // Pause, then "send" it — populate bubble and reveal
          setTimeout(() => {
            chatInput.value = '';
            if (textElement) textElement.textContent = fullText;
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
            chatMessages.scrollTop = chatMessages.scrollHeight;
            msgIndex++;
            setTimeout(showNextMessage, 1000);
          }, 600);
        }
      };
      setTimeout(typeInInput, 400);
    } else {
      // Bot message: type into bubble
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
      if (textElement && fullText) {
        let i = 0;
        const type = () => {
          if (i < fullText.length) {
            textElement.textContent += fullText[i++];
            chatMessages.scrollTop = chatMessages.scrollHeight;
            setTimeout(type, 15 + Math.random() * 20);
          } else {
            msgIndex++;
            setTimeout(showNextMessage, 1200);
          }
        };
        setTimeout(type, 400);
      } else {
        msgIndex++;
        setTimeout(showNextMessage, 800);
      }
    }
  }
  setTimeout(showNextMessage, 2200);
}

// ── Mobile Menu Toggle ──
document.getElementById('mobileMenuToggle')?.addEventListener('click', () => {
    document.getElementById('navLinks')?.classList.toggle('active');
});

// ── Scroll Reveal ──
const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children');
if (revealElements.length) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  revealElements.forEach(el => observer.observe(el));
}

// ── Score Ring Animation ──
function animateScore(score) {
  const circle = document.getElementById('scoreCircle');
  const text = document.getElementById('scoreText');
  if (!circle || !text) return;
  const circumference = 2 * Math.PI * 52;
  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = circumference;
  const offset = circumference - (score / 100) * circumference;
  circle.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)';
  setTimeout(() => { circle.style.strokeDashoffset = offset; }, 100);
  let currentScore = 0;
  const interval = setInterval(() => {
    currentScore += 1;
    if (currentScore >= score) { currentScore = score; clearInterval(interval); }
    text.textContent = `${currentScore}%`;
  }, 15);
}

// ── Chat Preview Tilt ──
const chatPreview = document.getElementById('chatPreview');
if (chatPreview) {
  const glow = chatPreview.querySelector('.tilt-glow');
  if (glow) {
    chatPreview.addEventListener('mousemove', (e) => {
      const rect = chatPreview.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / centerY * -5;
      const rotateY = (x - centerX) / centerX * 5;
      chatPreview.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(0)`;
      glow.style.left = `${x}px`;
      glow.style.top = `${y}px`;
    });
    chatPreview.addEventListener('mouseleave', () => {
      chatPreview.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
  }
}

// ── Reset Button ──
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    const section = document.getElementById('resultSection');
    if (section) section.hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── Copy Report ──
const copyBtn = document.getElementById('copyReportBtn');
if (copyBtn) {
  copyBtn.addEventListener('click', () => {
    const details = document.getElementById('resultDetails');
    if (!details) return;
    const text = Array.from(details.querySelectorAll('.result-item'))
      .map(item => `${item.querySelector('h4')?.textContent || ''}: ${item.querySelector('p')?.textContent || ''}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      const span = copyBtn.querySelector('span');
      if (span) {
        const orig = span.textContent;
        span.textContent = 'Copied!';
        setTimeout(() => { span.textContent = orig; }, 2000);
      }
    });
  });
}
