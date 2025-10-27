import mongoose from 'mongoose';

const TodoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  done: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Todo', TodoSchema);
