import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  traceId: String,
  userId: mongoose.Schema.Types.ObjectId,
  userMessage: String,
  toolName: String,
  toolArgs: mongoose.Schema.Types.Mixed,
  toolResult: mongoose.Schema.Types.Mixed,
  status: String,
  latencyMs: Number,
}, { timestamps: true });

export default mongoose.model('AuditLog', auditSchema);