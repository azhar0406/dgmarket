import { Hero } from '@/components/home/hero';
import { Features } from '@/components/home/features';
import { HowItWorks } from '@/components/home/how-it-works';
import { Stats } from '@/components/home/stats';
import { Navigation } from '@/components/navigation/navigation';
import { Footer } from '@/components/layout/footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Stats />
      </main>
      <Footer />
    </div>
  );
}