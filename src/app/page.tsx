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
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Hero />
        <main className="space-y-4">
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
