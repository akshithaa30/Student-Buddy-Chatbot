import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['user', 'bot', 'system'], required: true },
  text: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('Message', MessageSchema);
