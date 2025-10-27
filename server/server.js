import express from 'express';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js'; // <- path to your auth routes
import todoRoutes from './routes/todoRoutes.js'; 
import chatRoutes from './routes/chatRoutes.js'; // your existing chat API
import reviewRoutes from './routes/reviewRoutes.js';

const app = express();
app.use(express.json());

// CORS (optional if frontend served separately)
import cors from 'cors';
app.use(cors());

// Serve frontend (absolute path) - register static before API routes so static files are served correctly
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath)); // serve files from server/public

// Routes
app.use('/api', authRoutes);
app.use('/api/todo', todoRoutes);
app.use('/api', chatRoutes); // your chatbot APIs
// Reviews API
app.use('/api/reviews', reviewRoutes);

// MongoDB
mongoose.connect('mongodb://localhost:27017/studentbot', { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(()=>console.log('✅ MongoDB connected'))
.catch(err=>console.log(err));

// Start server
const PORT = process.env.PORT || 1414;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
