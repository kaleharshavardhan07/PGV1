// Seed data (mirrors the frontend src/data/seed.ts for a coherent demo).
export const DEMO_PASSWORD = 'demo1234';

export const owner = {
  pgName: 'Shree Ganesh PG',
  pgUsername: 'shreeganesh_pg_4821',
  description:
    'Comfortable co-living PG with home-style food, high-speed WiFi and daily housekeeping. Walking distance from Baner IT park.',
  address: 'Plot 14, Baner Road',
  area: 'Baner',
  city: 'Pune',
  state: 'Maharashtra',
  pinCode: '411045',
  latitude: 18.559,
  longitude: 73.7868,
  pgType: 'Co-living',
  ownerName: 'Rajesh Sharma',
  ownerEmail: 'owner@shreeganeshpg.in',
  ownerMobile: '9822011223',
};

export const secondOwner = {
  pgName: 'Royal Stay',
  pgUsername: 'royalstay_7291',
  description: 'Boys PG with single and double sharing rooms, study desks, and Mess facility. Near Andheri metro station.',
  address: 'Lokhandwala, Andheri West',
  area: 'Andheri West',
  city: 'Mumbai',
  state: 'Maharashtra',
  pinCode: '400053',
  latitude: 19.1363,
  longitude: 72.8277,
  pgType: 'Boys',
  ownerName: 'Sunita Kapoor',
  ownerEmail: 'sunita@royalstay.in',
  ownerMobile: '9820044556',
};

export const manager = {
  fullName: 'Deepak Patil',
  email: 'manager@shreeganeshpg.in',
  mobile: '9822055667',
};

export const settings = {
  name: 'Shree Ganesh PG',
  address: 'Plot 14, Baner Road',
  city: 'Pune',
  contactEmail: 'owner@shreeganeshpg.in',
  contactPhone: '+91 98220 11223',
  electricityRate: 9,
  ownerName: 'Rajesh Sharma',
  timezone: 'Asia/Kolkata',
  channels: { whatsapp: true, sms: true, email: true },
};

export const rooms = [
  { rent: 7500, roomNumber: '101', floor: 1, beds: 2, sharingType: 2, attachedBathroom: true },
  { rent: 6500, roomNumber: '102', floor: 1, beds: 3, sharingType: 3, attachedBathroom: true },
  { rent: 9500, roomNumber: '103', floor: 1, beds: 1, sharingType: 1, attachedBathroom: true },
  { rent: 5500, roomNumber: '104', floor: 1, beds: 4, sharingType: 4, attachedBathroom: false },
  { rent: 7500, roomNumber: '201', floor: 2, beds: 2, sharingType: 2, attachedBathroom: true },
  { rent: 6500, roomNumber: '202', floor: 2, beds: 3, sharingType: 3, attachedBathroom: true },
  { rent: 6500, roomNumber: '203', floor: 2, beds: 2, sharingType: 2, attachedBathroom: false },
  { rent: 5500, roomNumber: '204', floor: 2, beds: 4, sharingType: 4, attachedBathroom: false },
  { rent: 5500, roomNumber: '301', floor: 3, beds: 4, sharingType: 4, attachedBathroom: true },
  { rent: 5000, roomNumber: '302', floor: 3, beds: 6, sharingType: 6, attachedBathroom: false },
];

// tenant: roomNumber, bedNumber, monthlyRent, securityDeposit, joiningDate (day offset)
export const tenants = [
  { fullName: 'Amit Kumar', mobile: '9876500011', email: 'amit.kumar@example.com', emergencyContact: '9876511111', room: '101', bedNumber: 1, monthlyRent: 7500, securityDeposit: 15000, joiningDaysAgo: 120, policeVerification: 'Verified', status: 'Active' },
  { fullName: 'Rohan Verma', mobile: '9876500012', email: 'rohan.verma@example.com', emergencyContact: '9876522222', room: '101', bedNumber: 2, monthlyRent: 7500, securityDeposit: 15000, joiningDaysAgo: 90, policeVerification: 'Verified', status: 'Active' },
  { fullName: 'Sneha Patil', mobile: '9876500013', email: 'sneha.patil@example.com', emergencyContact: '9876533333', room: '102', bedNumber: 1, monthlyRent: 6500, securityDeposit: 13000, joiningDaysAgo: 150, policeVerification: 'Verified', status: 'Active' },
  { fullName: 'Priya Nair', mobile: '9876500014', email: 'priya.nair@example.com', emergencyContact: '9876544444', room: '103', bedNumber: 1, monthlyRent: 9500, securityDeposit: 19000, joiningDaysAgo: 60, policeVerification: 'Verified', status: 'Active' },
  { fullName: 'Vikram Singh', mobile: '9876500015', email: 'vikram.singh@example.com', emergencyContact: '9876555555', room: '104', bedNumber: 1, monthlyRent: 5500, securityDeposit: 11000, joiningDaysAgo: 30, policeVerification: 'Pending', status: 'Active' },
  { fullName: 'Anjali Gupta', mobile: '9876500016', email: 'anjali.gupta@example.com', emergencyContact: '9876566666', room: '104', bedNumber: 2, monthlyRent: 5500, securityDeposit: 11000, joiningDaysAgo: 180, policeVerification: 'Verified', status: 'Active' },
  { fullName: 'Neha Joshi', mobile: '9876500017', email: 'neha.joshi@example.com', emergencyContact: '9876577777', room: '201', bedNumber: 1, monthlyRent: 7500, securityDeposit: 15000, joiningDaysAgo: 210, policeVerification: 'Verified', status: 'Notice Period' },
  { fullName: 'Karan Mehta', mobile: '9876500018', email: 'karan.mehta@example.com', emergencyContact: '9876588888', room: '202', bedNumber: 1, monthlyRent: 6500, securityDeposit: 13000, joiningDaysAgo: 60, policeVerification: 'Verified', status: 'Active' },
  { fullName: 'Divya Reddy', mobile: '9876500019', email: 'divya.reddy@example.com', emergencyContact: '9876599999', room: '301', bedNumber: 1, monthlyRent: 5500, securityDeposit: 11000, joiningDaysAgo: 30, policeVerification: 'Pending', status: 'Active' },
];

export const menuData = {
  Monday: { breakfast: ['Poha', 'Boiled Eggs', 'Tea / Coffee'], lunch: ['Dal Tadka', 'Aloo Sabzi', 'Roti', 'Rice', 'Salad'], dinner: ['Paneer Bhurji', 'Roti', 'Dal', 'Rice'] },
  Tuesday: { breakfast: ['Idli', 'Sambar', 'Coconut Chutney', 'Tea / Coffee'], lunch: ['Rajma', 'Jeera Rice', 'Roti', 'Curd', 'Salad'], dinner: ['Veg Pulao', 'Raita', 'Papad'] },
  Wednesday: { breakfast: ['Upma', 'Fruit Bowl', 'Tea / Coffee'], lunch: ['Chole', 'Rice', 'Roti', 'Boondi Raita'], dinner: ['Mixed Veg Curry', 'Dal Fry', 'Roti', 'Rice'] },
  Thursday: { breakfast: ['Masala Dosa', 'Sambar', 'Chutney', 'Tea / Coffee'], lunch: ['Kadhi Pakora', 'Aloo Gobi', 'Roti', 'Rice'], dinner: ['Egg Curry / Veg Kofta', 'Roti', 'Dal', 'Rice'] },
  Friday: { breakfast: ['Bread Butter', 'Banana', 'Tea / Coffee'], lunch: ['Sambar', 'Cabbage Sabzi', 'Roti', 'Rice', 'Papad'], dinner: ['Chole Bhature', 'Salad', 'Raita'] },
  Saturday: { breakfast: ['Aloo Paratha', 'Curd', 'Pickle', 'Tea / Coffee'], lunch: ['Veg Biryani', 'Raita', 'Papad'], dinner: ['Dal Makhani', 'Jeera Rice', 'Roti', 'Salad'] },
  Sunday: { breakfast: ['Puri Bhaji', 'Jalebi', 'Tea / Coffee'], lunch: ['Special Thali (Paneer, Dal, Rice, Roti, Sweet)'], dinner: ['Fried Rice', 'Manchurian', 'Soup'] },
};

export const mealTimings = { Breakfast: '7:30 AM – 9:30 AM', Lunch: '12:30 PM – 2:30 PM', Dinner: '8:00 PM – 10:00 PM' };

export const complaints = [
  { tenant: 'Amit Kumar', category: 'AC', description: 'AC not cooling properly since last night. It only blows normal air even at 18 degrees.', roomNumber: '101', status: 'Resolved', daysAgo: 6 },
  { tenant: 'Rohan Verma', category: 'WiFi', description: 'WiFi keeps disconnecting every few minutes in the evenings.', roomNumber: '101', status: 'Seen', daysAgo: 2 },
  { tenant: 'Sneha Patil', category: 'Water', description: 'Very low water pressure in the bathroom since morning.', roomNumber: '102', status: 'In Progress', daysAgo: 1, remarks: 'Plumber has been scheduled for tomorrow morning.' },
  { tenant: 'Vikram Singh', category: 'Cleaning', description: 'The corridor on the first floor has not been cleaned this week.', roomNumber: '104', status: 'Submitted', hoursAgo: 5 },
  { tenant: 'Priya Nair', category: 'Electrical', description: 'Tube light in the study table area is flickering continuously.', roomNumber: '103', status: 'Submitted', hoursAgo: 1 },
];

