import Group from "../models/Group.model.js";
import ApiError from "../utils/ApiError.js"
import User from "../models/User.model.js"

export const createGroup = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            throw new ApiError(400, " Group name is required")
        }

        const group = new Group({
            name: name.trim(),
            description: description?.trim(),
            creator: req.user._id,

        });
        await group.save();

        // Populate creator Info for response

        const populatedGroup = await Group.findById(group._id)
            .populate('creator', 'username email')
            .populate('members.user', 'username email');

        res.status(200)
            .json({
                success: true,
                message: 'Group created successfully',
                group: populatedGroup,
            });
    } catch (error) {
        next(error);
    }
};


export const getMyGroups = async (req, res, next) => {
    try {
        const groups = await Group.find({
            'members.user': req.user._id,
        })

            .populate('creator', 'username email')
            .populate('members.user', 'username email')
            .sort({ createdAt: -1 });

        res.status(200)
            .json({
                success: true,
                count: groups.length,
                groups,
            })
    } catch (err) {
        next(err);
    }
};

export const getGroupById = async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('creator', 'username, email')
            .populate('members.user', 'username , email')

        if (!group) {
            throw new ApiError(404, ' Group not found')
        }

        // check if current user is a member 

        const isMember = group.members.some(
            (m) => m.user.toString() === req.user._id.toString()
        );

        if (!isMember) {
            throw new ApiError(403, 'You do not have access to this group')
        }

        res.status(200)
            .json({
                success: true,
                group,
            })

    } catch (err) {
        next(err)
    }
};

export const addMember = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;   // expect userId in body

        if (!userId) {
            throw new ApiError(400, 'userId is required in request body');
        }

        const group = await Group.findById(groupId);
        if (!group) {
            throw new ApiError(404, 'Group not found');
        }

        // Only creator can add members
        if (group.creator.toString() !== req.user._id.toString()) {
            throw new ApiError(403, 'Only group creator can add members');
        }

        // Check if user exists in DB
        const userToAdd = await User.findById(userId);
        if (!userToAdd) {
            throw new ApiError(404, 'User to add not found');
        }

        // Check if already a member
        if (group.members.some(m => m.user.toString() === userId)) {
            throw new ApiError(400, 'User is already a member of this group');
        }

        // Add the member
        group.members.push({ user: userId });
        await group.save();

        // Optional: populate for response
        await group.populate('members.user', 'username email');

        res.status(200).json({
            success: true,
            message: 'Member added successfully',
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
            throw new ApiError(403, 'ONly group creator can remove members')
        }

        if (memberId == group.creator.toString()) {
            throw new ApiError(400, 'Creator cannot  be removed. Delete the group instead')
        }

        group.members = group.members.filter(m => m.user.toString() !== memberId);
        await group.save();

        res.status(200)
            .json({
                success: true,
                message: "Member removed successfully",
                group,
            });
    } catch (err) {
        next(err)
    }
}

export const leaveGroup = async (req, res, next) => {
    try {
        const { groupId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) {
            throw new ApiError(404, 'Group not found');
        }

        const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) {
            throw new ApiError(400, 'You are not a member of this group');
        }

        if (group.creator.toString() === req.user._id.toString()) {
            throw new ApiError(400, 'Creator cannot leave. Delete the group instead')
        }

        group.members = group.memebers.filter(m => m.user.toString() !== req.user._id.toString());

        await group.save();

        res.status(200)
            .json({
                success: true,
                message: 'Left group successfully'
            });

    } catch (error) {
        next(error);
    }
}
// Delete group (creator only)
export const deleteGroup = async (req, res, next) => {
    try {
        const { groupId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) {
            throw new ApiError(404, 'Group not found');
        }

        if (group.creator.toString() !== req.user._id.toString()) {
            throw new ApiError(403, 'Only group creator can delete the group');
        }

        await Group.findByIdAndDelete(groupId);

        res.status(200).json({
            success: true,
            message: 'Group deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};