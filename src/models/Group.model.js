import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      minlength: [3, 'Group name must be at least 3 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    avatar: {
      type: String,
      default: '/uploads/default-group.png',
    },
  },
  { timestamps: true }
);

// Auto-add creator to members - simplified approach
groupSchema.pre('save', function() {
  if (this.isNew && this.creator) {
    const creatorId = this.creator.toString();
    const memberExists = this.members.some(
      m => m.user.toString() === creatorId
    );
    
    if (!memberExists) {
      this.members.push({ user: this.creator });
    }
  }
});

const Group = mongoose.model('Group', groupSchema);

export default Group;