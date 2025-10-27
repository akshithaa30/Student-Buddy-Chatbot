import mongoose from 'mongoose';
import Review from '../models/Review.js';

async function main(){
  await mongoose.connect('mongodb://localhost:27017/studentbot');
  console.log('connected');
  const r = await Review.create({ userId: 'bcode', rating: 5, comment: 'Great bcode integration!' });
  console.log('created', r._id);
  process.exit(0);
}

main().catch(err=>{ console.error(err); process.exit(1); });
