import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
	userId: { type: String, default: 'anonymous' },
	rating: { type: Number, required: true, min: 1, max: 5 },
	comment: { type: String, default: '' }
}, { timestamps: true });

const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);

export default Review;

