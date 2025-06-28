'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { GIFT_CARD_CATEGORIES } from '@/lib/constants';
import { useAppStore } from '@/lib/store';

interface MarketplaceFiltersProps {
  sortBy: string;
  setSortBy: (value: string) => void;
  priceRange: number[];
  setPriceRange: (value: number[]) => void;
}

export function MarketplaceFilters({
  sortBy,
  setSortBy,
  priceRange,
  setPriceRange,
}: MarketplaceFiltersProps) {
  const { selectedCategory, setSelectedCategory } = useAppStore();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {GIFT_CARD_CATEGORIES.map((category) => (
            <div
              key={category.id}
              className={`cursor-pointer rounded-lg p-3 transition-colors hover:bg-accent ${
                selectedCategory === category.id ? 'bg-accent' : ''
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{category.name}</span>
                {selectedCategory === category.id && (
                  <Badge variant="secondary">Selected</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {category.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Price Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            max={1000}
            min={0}
            step={10}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sort By</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={sortBy} onValueChange={setSortBy}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="newest" id="newest" />
              <Label htmlFor="newest">Newest First</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="price-low" id="price-low" />
              <Label htmlFor="price-low">Price: Low to High</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="price-high" id="price-high" />
              <Label htmlFor="price-high">Price: High to Low</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="popular" id="popular" />
              <Label htmlFor="popular">Most Popular</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}