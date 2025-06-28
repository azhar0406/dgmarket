'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface GiftCard {
  id: string;
  brand: string;
  category: string;
  value: number;
  price: number;
  discount: number;
  image: string;
  seller: string;
  createdAt: Date;
  isVerified: boolean;
}

interface GiftCardItemProps {
  card: GiftCard;
}

export function GiftCardItem({ card }: GiftCardItemProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full transition-all duration-200 hover:shadow-lg">
        <CardHeader className="p-0">
          <div className="relative aspect-video overflow-hidden rounded-t-lg">
            <Image
              src={card.image}
              alt={card.brand}
              fill
              className="object-cover transition-transform duration-200 hover:scale-105"
            />
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                {card.discount}% off
              </Badge>
            </div>
            {card.isVerified && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-green-600 hover:bg-green-700">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="mb-3">
            <h3 className="font-semibold text-lg">{card.brand}</h3>
            <p className="text-sm text-muted-foreground capitalize">{card.category}</p>
          </div>
          
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">${card.price}</span>
              <span className="text-sm text-muted-foreground line-through">
                ${card.value}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{card.seller}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{card.createdAt.toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0">
          <Button className="w-full" size="sm">
            Purchase Gift Card
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}