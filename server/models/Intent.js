import mongoose from 'mongoose';

const IntentSchema = new mongoose.Schema({
  tags: [{ type: String }],
  patterns: [{ type: String, required: true }],
  responses: [{ type: String, required: true }],
}, { timestamps: true });

export default mongoose.model('Intent', IntentSchema);
