import Group from "../models/Group.model.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/User.model.js";

export const createGroup = async (req, res, next) => {
  try {
    const { name, description, currency = "INR" } = req.body;

    if (!name) {
      throw new ApiError(400, "Group name is required");
    }

    if (!currency) {
      throw new ApiError(400, "Currency is required");
    }

    const group = new Group({
      name: name.trim(),
      description: description?.trim(),
      currency: currency.toUpperCase(),
      creator: req.user._id,
    });

    await group.save();

    // Populate creator and members info for response
    const populatedGroup = await Group.findById(group._id)
      .populate("creator", "username email")
      .populate("members.user", "username email");

    res.status(201).json({
      success: true,
      message: "Group created successfully",
      group: populatedGroup,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({
      $or: [{ creator: req.user._id }, { "members.user": req.user._id }],
    })
      .populate("creator", "username email")
      .populate("members.user", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: groups.length,
      groups: groups.map((group) => ({
        _id: group._id,
        name: group.name,
        description: group.description,
        currency: group.currency,
        creator: group.creator,
        members: group.members,
        createdAt: group.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const getGroupById = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("creator", "username email")
      .populate("members.user", "username email");

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    // Check if current user is a member
    const isMember = group.members.some(
      (m) => m.user._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      throw new ApiError(403, "You do not have access to this group");
    }

    res.status(200).json({
      success: true,
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        currency: group.currency,
        creator: group.creator,
        members: group.members,
        createdAt: group.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const addMember = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      throw new ApiError(400, "userId is required in request body");
    }

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    // Only creator can add members
    if (group.creator.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Only group creator can add members");
    }

    // Check if user exists
    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      throw new ApiError(404, "User to add not found");
    }

    // Check if already a member
    if (group.members.some((m) => m.user.toString() === userId)) {
      throw new ApiError(400, "User is already a member of this group");
    }

    group.members.push({ user: userId });
    await group.save();

    // Populate for response
    await group.populate("members.user", "username email");

    res.status(200).json({
      success: true,
      message: "Member added successfully",
      group,
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { groupId, memberId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    if (group.creator.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Only group creator can remove members");
    }

    if (memberId === group.creator.toString()) {
      throw new ApiError(400, "Creator cannot be removed. Delete the group instead");
    }

    group.members = group.members.filter((m) => m.user.toString() !== memberId);
    await group.save();

    res.status(200).json({
      success: true,
      message: "Member removed successfully",
      group,
    });
  } catch (err) {
    next(err);
  }
};

export const leaveGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    const isMember = group.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (!isMember) {
      throw new ApiError(400, "You are not a member of this group");
    }

    if (group.creator.toString() === req.user._id.toString()) {
      throw new ApiError(400, "Creator cannot leave. Delete the group instead");
    }

    group.members = group.members.filter(
      (m) => m.user.toString() !== req.user._id.toString()
    );

    await group.save();

    res.status(200).json({
      success: true,
      message: "Left group successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    if (group.creator.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Only group creator can delete the group");
    }

    await Group.findByIdAndDelete(groupId);

    res.status(200).json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};