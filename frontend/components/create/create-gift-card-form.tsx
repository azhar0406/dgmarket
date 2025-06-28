'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Upload, Shield, Lock } from 'lucide-react';
import { GIFT_CARD_CATEGORIES } from '@/lib/constants';
import { toast } from 'sonner';

const createGiftCardSchema = z.object({
  brand: z.string().min(1, 'Brand name is required'),
  category: z.string().min(1, 'Category is required'),
  value: z.number().min(1, 'Gift card value must be positive'),
  askingPrice: z.number().min(1, 'Asking price must be positive'),
  giftCardCode: z.string().min(1, 'Gift card code is required'),
  description: z.string().optional(),
  isPrivate: z.boolean().default(true),
  image: z.any().optional(),
});

type CreateGiftCardForm = z.infer<typeof createGiftCardSchema>;

export function CreateGiftCardForm() {
  const form = useForm<CreateGiftCardForm>({
    resolver: zodResolver(createGiftCardSchema),
    defaultValues: {
      isPrivate: true,
    },
  });

  const onSubmit = async (data: CreateGiftCardForm) => {
    try {
      // Here you would integrate with your smart contract
      console.log('Creating gift card:', data);
      toast.success('Gift card created successfully!');
    } catch (error) {
      toast.error('Failed to create gift card');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Privacy & Security
          </CardTitle>
          <CardDescription>
            Your gift card details are encrypted using Inco Lightning's TEE technology for maximum privacy.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gift Card Details</CardTitle>
          <CardDescription>
            Enter your gift card information. All sensitive data will be encrypted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="brand">Brand Name</Label>
                <Input
                  id="brand"
                  placeholder="e.g., Amazon, Starbucks"
                  {...form.register('brand')}
                />
                {form.formState.errors.brand && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.brand.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select onValueChange={(value) => form.setValue('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {GIFT_CARD_CATEGORIES.slice(1).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.category && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.category.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="value">Gift Card Value ($)</Label>
                <Input
                  id="value"
                  type="number"
                  placeholder="100"
                  {...form.register('value', { valueAsNumber: true })}
                />
                {form.formState.errors.value && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.value.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="askingPrice">Asking Price ($)</Label>
                <Input
                  id="askingPrice"
                  type="number"
                  placeholder="90"
                  {...form.register('askingPrice', { valueAsNumber: true })}
                />
                {form.formState.errors.askingPrice && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.askingPrice.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="giftCardCode" className="flex items-center gap-2">
                Gift Card Code
                <Lock className="h-4 w-4 text-muted-foreground" />
              </Label>
              <Input
                id="giftCardCode"
                type="password"
                placeholder="Enter gift card code (will be encrypted)"
                {...form.register('giftCardCode')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be encrypted and only accessible to the buyer
              </p>
              {form.formState.errors.giftCardCode && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.giftCardCode.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any additional information about the gift card..."
                {...form.register('description')}
              />
            </div>

            <div>
              <Label htmlFor="image">Gift Card Image (Optional)</Label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-muted-foreground/25 rounded-md hover:border-muted-foreground/50 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="flex text-sm text-muted-foreground">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-background rounded-md font-medium text-primary hover:text-primary/80">
                      <span>Upload a file</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPrivate"
                checked={form.watch('isPrivate')}
                onCheckedChange={(checked) => form.setValue('isPrivate', checked)}
              />
              <Label htmlFor="isPrivate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Private listing (only visible to direct link holders)
              </Label>
            </div>

            <Button type="submit" className="w-full" size="lg">
              Create Gift Card
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}