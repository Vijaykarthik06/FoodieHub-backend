const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Product = require('../models/Product');

const createSampleData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Restaurant.deleteMany({});
    await Product.deleteMany({});

    console.log('🗑️  Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@foodiehub.com',
      password: 'admin123',
      role: 'admin',
      phone: '+1-555-0101'
    });

    // Create restaurant owner
    const restaurantOwner = await User.create({
      name: 'Restaurant Owner',
      email: 'owner@pizzapalace.com',
      password: 'owner123',
      role: 'restaurant_owner',
      phone: '+1-555-0102'
    });

    // Create customer user
    const customerUser = await User.create({
      name: 'John Customer',
      email: 'customer@example.com',
      password: 'customer123',
      role: 'customer',
      phone: '+1-555-0103',
      address: {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001'
      }
    });

    console.log('👥 Created sample users');

    // Create sample restaurants
    const pizzaPalace = await Restaurant.create({
      name: 'Pizza Palace',
      description: 'Authentic Italian pizzas made with fresh ingredients and traditional recipes. Family-owned since 1995.',
      cuisine: ['italian', 'pizza'],
      address: {
        street: '456 Pizza Avenue',
        city: 'New York',
        state: 'NY',
        zipCode: '10002',
        coordinates: {
          latitude: 40.7282,
          longitude: -73.9942
        }
      },
      contact: {
        phone: '+1-555-PIZZA',
        email: 'info@pizzapalace.com',
        website: 'https://pizzapalace.com'
      },
      hours: {
        monday: { open: '11:00', close: '22:00' },
        tuesday: { open: '11:00', close: '22:00' },
        wednesday: { open: '11:00', close: '22:00' },
        thursday: { open: '11:00', close: '23:00' },
        friday: { open: '11:00', close: '00:00' },
        saturday: { open: '11:00', close: '00:00' },
        sunday: { open: '12:00', close: '22:00' }
      },
      deliveryInfo: {
        deliveryFee: 2.99,
        minOrder: 15,
        deliveryTime: 25,
        deliveryRadius: 4
      },
      rating: 4.5,
      numReviews: 128,
      images: [
        { url: '/images/restaurants/pizza-palace-1.jpg', alt: 'Pizza Palace Interior' },
        { url: '/images/restaurants/pizza-palace-2.jpg', alt: 'Fresh Pizza' }
      ],
      owner: restaurantOwner._id,
      tags: ['family-friendly', 'authentic', 'wood-fired'],
      averagePreparationTime: 18
    });

    const burgerJoint = await Restaurant.create({
      name: 'Burger Joint',
      description: 'Gourmet burgers with premium ingredients and creative toppings. Perfect for burger enthusiasts!',
      cuisine: ['american', 'burgers'],
      address: {
        street: '789 Burger Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10003',
        coordinates: {
          latitude: 40.7336,
          longitude: -73.9907
        }
      },
      contact: {
        phone: '+1-555-BURGER',
        email: 'hello@burgerjoint.com'
      },
      hours: {
        monday: { open: '10:00', close: '23:00' },
        tuesday: { open: '10:00', close: '23:00' },
        wednesday: { open: '10:00', close: '23:00' },
        thursday: { open: '10:00', close: '00:00' },
        friday: { open: '10:00', close: '01:00' },
        saturday: { open: '10:00', close: '01:00' },
        sunday: { open: '10:00', close: '22:00' }
      },
      deliveryInfo: {
        deliveryFee: 3.49,
        minOrder: 12,
        deliveryTime: 20,
        deliveryRadius: 3
      },
      rating: 4.3,
      numReviews: 95,
      owner: restaurantOwner._id,
      tags: ['gourmet', 'craft-beer', 'late-night'],
      averagePreparationTime: 15
    });

    console.log('🍕 Created sample restaurants');

    // Create sample products for Pizza Palace
    const pizzaProducts = await Product.create([
      {
        name: 'Margherita Pizza',
        description: 'Classic pizza with San Marzano tomatoes, fresh mozzarella, basil, and extra virgin olive oil',
        price: 16.99,
        originalPrice: 18.99,
        image: '/images/products/margherita-pizza.jpg',
        category: 'main_course',
        subcategory: 'pizza',
        ingredients: ['San Marzano tomatoes', 'Fresh mozzarella', 'Basil', 'Extra virgin olive oil', 'Sea salt'],
        nutritionalInfo: {
          calories: 850,
          protein: '35g',
          carbs: '95g',
          fat: '32g',
          allergens: ['gluten', 'dairy'],
          servingSize: '12 inch pizza'
        },
        restaurant: pizzaPalace._id,
        isVegetarian: true,
        preparationTime: 15,
        tags: ['classic', 'vegetarian', 'fresh'],
        customizationOptions: [
          {
            name: 'Crust',
            options: [
              { name: 'Thin Crust', price: 0 },
              { name: 'Thick Crust', price: 1.50 },
              { name: 'Gluten-Free', price: 3.00 }
            ]
          },
          {
            name: 'Extra Toppings',
            options: [
              { name: 'Extra Cheese', price: 2.00 },
              { name: 'Mushrooms', price: 1.50 },
              { name: 'Olives', price: 1.50 }
            ]
          }
        ]
      },
      {
        name: 'Pepperoni Supreme',
        description: 'Loaded with double pepperoni, mozzarella, and our signature tomato sauce',
        price: 19.99,
        image: '/images/products/pepperoni-pizza.jpg',
        category: 'main_course',
        subcategory: 'pizza',
        ingredients: ['Pepperoni', 'Mozzarella cheese', 'Tomato sauce', 'Oregano'],
        restaurant: pizzaPalace._id,
        preparationTime: 18,
        spiceLevel: 2,
        tags: ['meat-lovers', 'spicy']
      },
      {
        name: 'Garlic Breadsticks',
        description: 'Freshly baked breadsticks brushed with garlic butter and herbs',
        price: 6.99,
        image: '/images/products/garlic-breadsticks.jpg',
        category: 'appetizers',
        ingredients: ['Bread dough', 'Garlic', 'Butter', 'Parsley', 'Parmesan'],
        restaurant: pizzaPalace._id,
        isVegetarian: true,
        preparationTime: 8,
        tags: ['shareable', 'garlic']
      },
      {
        name: 'Caesar Salad',
        description: 'Crisp romaine lettuce with Caesar dressing, croutons, and parmesan',
        price: 9.99,
        image: '/images/products/caesar-salad.jpg',
        category: 'salads',
        ingredients: ['Romaine lettuce', 'Caesar dressing', 'Croutons', 'Parmesan cheese'],
        nutritionalInfo: {
          calories: 320,
          protein: '12g',
          carbs: '18g',
          fat: '24g',
          allergens: ['gluten', 'dairy'],
          servingSize: 'Regular bowl'
        },
        restaurant: pizzaPalace._id,
        isVegetarian: true,
        preparationTime: 5,
        tags: ['fresh', 'healthy']
      }
    ]);

    // Create sample products for Burger Joint
    const burgerProducts = await Product.create([
      {
        name: 'Classic Cheeseburger',
        description: 'Juicy beef patty with cheddar cheese, lettuce, tomato, and special sauce',
        price: 12.99,
        image: '/images/products/classic-cheeseburger.jpg',
        category: 'main_course',
        subcategory: 'burgers',
        ingredients: ['Beef patty', 'Cheddar cheese', 'Lettuce', 'Tomato', 'Onion', 'Pickles', 'Special sauce'],
        nutritionalInfo: {
          calories: 680,
          protein: '28g',
          carbs: '45g',
          fat: '38g',
          allergens: ['gluten', 'dairy'],
          servingSize: '1 burger with bun'
        },
        restaurant: burgerJoint._id,
        preparationTime: 12,
        tags: ['classic', 'beef']
      },
      {
        name: 'Bacon BBQ Burger',
        description: 'Beef patty topped with crispy bacon, BBQ sauce, onion rings, and cheddar',
        price: 15.99,
        image: '/images/products/bacon-bbq-burger.jpg',
        category: 'main_course',
        subcategory: 'burgers',
        ingredients: ['Beef patty', 'Bacon', 'BBQ sauce', 'Onion rings', 'Cheddar cheese'],
        restaurant: burgerJoint._id,
        preparationTime: 14,
        tags: ['bacon', 'bbq']
      },
      {
        name: 'Crispy French Fries',
        description: 'Golden crispy fries seasoned with sea salt',
        price: 4.99,
        image: '/images/products/french-fries.jpg',
        category: 'sides',
        ingredients: ['Potatoes', 'Vegetable oil', 'Sea salt'],
        restaurant: burgerJoint._id,
        isVegetarian: true,
        isVegan: true,
        preparationTime: 6,
        tags: ['crispy', 'shareable']
      },
      {
        name: 'Chocolate Milkshake',
        description: 'Creamy chocolate milkshake made with real ice cream',
        price: 5.99,
        image: '/images/products/chocolate-milkshake.jpg',
        category: 'beverages',
        subcategory: 'shakes',
        ingredients: ['Vanilla ice cream', 'Chocolate syrup', 'Milk', 'Whipped cream'],
        restaurant: burgerJoint._id,
        isVegetarian: true,
        preparationTime: 4,
        tags: ['sweet', 'dessert']
      }
    ]);

    console.log('📦 Created sample products');
    console.log('✅ Sample data creation completed successfully!');
    
    console.log('\n📊 Sample Data Summary:');
    console.log(`👥 Users: 3 (Admin, Restaurant Owner, Customer)`);
    console.log(`🍕 Restaurants: 2 (Pizza Palace, Burger Joint)`);
    console.log(`📦 Products: ${pizzaProducts.length + burgerProducts.length} total products`);
    console.log(`🔑 Admin Login: admin@foodiehub.com / admin123`);
    console.log(`🔑 Customer Login: customer@example.com / customer123`);

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
};

// Run if this file is executed directly
if (require.main === module) {
  require('dotenv').config();
  
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodiehub';
  
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB');
      return createSampleData();
    })
    .then(() => {
      console.log('🎉 Sample data setup completed!');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Setup failed:', err);
      process.exit(1);
    });
}

module.exports = createSampleData;