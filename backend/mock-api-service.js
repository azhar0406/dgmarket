const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Mock gift card data organized by categories
const mockGiftCards = {
  "Food & Dining": [
    {
      value: 25,
      description: "McDonald's $25 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=McDonald%27s+$25",
      expiryDate: 0,
      code: "MCD25-ABCD-1234"
    },
    {
      value: 50,
      description: "Starbucks $50 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Starbucks+$50",
      expiryDate: 0,
      code: "SBX50-EFGH-5678"
    },
    {
      value: 100,
      description: "Uber Eats $100 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Uber+Eats+$100",
      expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
      code: "UBE100-IJKL-9012"
    },
    {
      value: 75,
      description: "DoorDash $75 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=DoorDash+$75",
      expiryDate: 0,
      code: "DD75-MNOP-3456"
    }
  ],
  "Shopping": [
    {
      value: 100,
      description: "Amazon $100 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Amazon+$100",
      expiryDate: 0,
      code: "AMZ100-QRST-7890"
    },
    {
      value: 50,
      description: "Target $50 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Target+$50",
      expiryDate: 0,
      code: "TGT50-UVWX-1234"
    },
    {
      value: 200,
      description: "Best Buy $200 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Best+Buy+$200",
      expiryDate: Math.floor(Date.now() / 1000) + (730 * 24 * 60 * 60), // 2 years from now
      code: "BBY200-YZAB-5678"
    },
    {
      value: 25,
      description: "Walmart $25 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Walmart+$25",
      expiryDate: 0,
      code: "WMT25-CDEF-9012"
    }
  ],
  "Entertainment": [
    {
      value: 15,
      description: "Netflix $15 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Netflix+$15",
      expiryDate: 0,
      code: "NFX15-GHIJ-3456"
    },
    {
      value: 25,
      description: "Spotify $25 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Spotify+$25",
      expiryDate: 0,
      code: "SPT25-KLMN-7890"
    },
    {
      value: 50,
      description: "Apple iTunes $50 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=iTunes+$50",
      expiryDate: 0,
      code: "ITN50-OPQR-1234"
    },
    {
      value: 20,
      description: "Google Play $20 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Google+Play+$20",
      expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
      code: "GPL20-STUV-5678"
    }
  ],
  "Travel": [
    {
      value: 500,
      description: "Airbnb $500 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Airbnb+$500",
      expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
      code: "ABB500-WXYZ-9012"
    },
    {
      value: 250,
      description: "Southwest Airlines $250 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Southwest+$250",
      expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
      code: "SWA250-ABCD-3456"
    },
    {
      value: 100,
      description: "Uber $100 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Uber+$100",
      expiryDate: 0,
      code: "UBR100-EFGH-7890"
    }
  ],
  "Gaming": [
    {
      value: 20,
      description: "Steam $20 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Steam+$20",
      expiryDate: 0,
      code: "STM20-IJKL-1234"
    },
    {
      value: 50,
      description: "PlayStation Store $50 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=PlayStation+$50",
      expiryDate: 0,
      code: "PSN50-MNOP-5678"
    },
    {
      value: 25,
      description: "Xbox $25 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Xbox+$25",
      expiryDate: 0,
      code: "XBX25-QRST-9012"
    },
    {
      value: 100,
      description: "Nintendo eShop $100 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Nintendo+$100",
      expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
      code: "NIN100-UVWX-3456"
    }
  ]
};

// Helper function to get random cards from a category
function getRandomCardsFromCategory(category, count = 2) {
  const categoryCards = mockGiftCards[category];
  if (!categoryCards || categoryCards.length === 0) {
    return [];
  }
  
  // If count is greater than available cards, return all cards
  if (count >= categoryCards.length) {
    return [...categoryCards];
  }
  
  // Randomly select 'count' cards
  const selectedCards = [];
  const availableIndices = Array.from({ length: categoryCards.length }, (_, i) => i);
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * availableIndices.length);
    const cardIndex = availableIndices.splice(randomIndex, 1)[0];
    selectedCards.push(categoryCards[cardIndex]);
  }
  
  return selectedCards;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DG Market Mock API',
    categories: Object.keys(mockGiftCards)
  });
});

// List available categories
app.get('/categories', (req, res) => {
  res.status(200).json({
    categories: Object.keys(mockGiftCards),
    count: Object.keys(mockGiftCards).length
  });
});

// Main endpoint for Chainlink Functions to call
app.get('/restock', (req, res) => {
  const { category } = req.query;
  
  // Default to Gaming if no category specified
  const targetCategory = category || 'Gaming';
  
  if (!mockGiftCards[targetCategory]) {
    return res.status(404).json({
      error: 'Category not found',
      availableCategories: Object.keys(mockGiftCards)
    });
  }
  
  // Get 2 random cards from the category
  const cards = getRandomCardsFromCategory(targetCategory, 2);
  
  // Log the request
  console.log(`[${new Date().toISOString()}] Restock request for category: ${targetCategory}, returning ${cards.length} cards`);
  
  // Return the cards in the format expected by the Chainlink function
  res.status(200).json({
    success: true,
    category: targetCategory,
    timestamp: Math.floor(Date.now() / 1000),
    cards: cards
  });
});

// Get all cards in a category
app.get('/category/:categoryName', (req, res) => {
  const { categoryName } = req.params;
  
  if (!mockGiftCards[categoryName]) {
    return res.status(404).json({
      error: 'Category not found',
      availableCategories: Object.keys(mockGiftCards)
    });
  }
  
  res.status(200).json({
    category: categoryName,
    cards: mockGiftCards[categoryName],
    count: mockGiftCards[categoryName].length
  });
});

// Get specific card by category and code
app.get('/card/:category/:code', (req, res) => {
  const { category, code } = req.params;
  
  if (!mockGiftCards[category]) {
    return res.status(404).json({ error: 'Category not found' });
  }
  
  const card = mockGiftCards[category].find(card => card.code === code);
  
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }
  
  res.status(200).json(card);
});

// Start the server
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`DG Market Mock API running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`- GET /health - Health check`);
  console.log(`- GET /categories - List all categories`);
  console.log(`- GET /restock?category=Gaming - Get cards for restocking (main endpoint for Chainlink)`);
  console.log(`- GET /category/:categoryName - Get all cards in a category`);
  console.log(`- GET /card/:category/:code - Get specific card`);
});
