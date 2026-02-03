import Group from "../models/Group.model.js";
import ApiError from "../utils/ApiError.js"

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
