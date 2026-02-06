import Hero from '@/components/Hero';
import About from '@/components/About';
import Skills from '@/components/Skills';
import Projects from '@/components/Projects';
import Experience from '@/components/Experience';
import Education from '@/components/Education';
import Awards from '@/components/Awards';
import Contact from '@/components/Contact';

export default function Home() {
  return (
    <div className="relative z-10 min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-32">
        <Hero />
        <main className="divide-y divide-neutral-800/40">
          <About />
          <Skills />
          <Projects />
          <Experience />
          <Education />
          <Awards />
          <Contact />
        </main>
      </div>
    </div>
  );
}
