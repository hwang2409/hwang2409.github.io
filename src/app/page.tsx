import PixelMascot from '@/components/PixelMascot';
import Shipping from '@/components/Shipping';
import SpotifyNow from '@/components/SpotifyNow';

export default function Home() {
  return (
    <>
      <section className="home-intro" aria-labelledby="home-name">
        <h1 id="home-name">hello, im henry</h1>
        <p>swe @ uwaterloo, currently working on agents at <a href="https://phoebe.work/" target="_blank" rel="noopener noreferrer">phoebe</a>; previously worked at <a href="https://fish.audio" target="_blank" rel="noopener noreferrer">fish audio</a> and <a href="https://www.nationgraph.com/" target="_blank" rel="noopener noreferrer">nationgraph</a>.</p>
      </section>


      <section className="home-section home-mascot" aria-label="pixel mascot">
        <PixelMascot />
      </section>

      <section className="home-section" aria-label="music">
        <SpotifyNow />
      </section>

      <Shipping />
    </>
  );
}
