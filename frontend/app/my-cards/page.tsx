import { MyCardsContainer } from '@/components/my-cards/my-cards-container';
import { Navigation } from '@/components/navigation/navigation';
import { Footer } from '@/components/layout/footer';

export default function MyCardsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
            My Gift Cards
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your created and purchased gift cards
          </p>
        </div>
        <MyCardsContainer />
      </main>
      <Footer />
    </div>
  );
}