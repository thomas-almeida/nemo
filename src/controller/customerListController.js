import CustomerList from "../models/CustomerList.js";
import User from "../models/User.js";

// Create a new customer list
export const createCustomerList = async (req, res) => {
    const { name, owner, customers = [] } = req.body;

    if (!name || !owner) {
        return res.status(400).json({
            success: false,
            error: 'Name and owner are required'
        });
    }

    try {
        const newList = await CustomerList.create({
            name,
            owner,
            customers
        });

        res.status(201).json({
            success: true,
            data: newList
        });
    } catch (error) {
        console.error('Error creating customer list:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create customer list'
        });
    }
};

// Get all customer lists for a specific owner
export const getCustomerLists = async (req, res) => {
    try {
        const { ownerId } = req.params;
        const lists = await CustomerList.find({ owner: ownerId })
            .populate('customers', 'name phone')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: lists.length,
            data: lists
        });
    } catch (error) {
        console.error('Error fetching customer lists:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch customer lists'
        });
    }
};

// Get a single customer list by ID
export const getCustomerListById = async (req, res) => {
    try {
        const { id, userId } = req.params;

        const owner = await User.findById(userId);

        if (!owner) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const list = await CustomerList.findById(id)
            .populate('customers', 'name phone');

        if (!list) {
            return res.status(404).json({
                success: false,
                error: 'Customer list not found'
            });
        }

        res.status(200).json({
            success: true,
            data: list
        });
    } catch (error) {
        console.error('Error fetching customer list:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch customer list'
        });
    }
};

// Update a customer list
export const updateCustomerList = async (req, res) => {
    try {
        const { id, userId } = req.params;
        const { name, customers } = req.body;

        const updates = {};
        if (name) updates.name = name;
        if (customers) updates.customers = customers;
        updates.updatedAt = Date.now();

        const owner = await CustomerList.findById(userId).owner;

        if (!owner) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const updatedList = await CustomerList.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!updatedList) {
            return res.status(404).json({
                success: false,
                error: 'Customer list not found'
            });
        }

        res.status(200).json({
            success: true,
            data: updatedList
        });
    } catch (error) {
        console.error('Error updating customer list:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update customer list'
        });
    }
};

// Delete a customer list
export const deleteCustomerList = async (req, res) => {
    try {
        const { id, userId } = req.params;
        const deletedList = await CustomerList.findByIdAndDelete(id);

        const owner = await CustomerList.findById(userId).owner;

        if (!owner) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (!deletedList) {
            return res.status(404).json({
                success: false,
                error: 'Customer list not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        console.error('Error deleting customer list:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete customer list'
        });
    }
};


export const addCustomerToCustomerList = async (req, res) => {
    try {
        const { id } = req.params;
        const { customerId } = req.body;

        const list = await CustomerList.findById(id);

        const owner = await User.findById(list.owner);

        if (!owner) {
            return res.status(404).json({
                success: false,
                error: 'Owner not found'
            });
        }


        if (!list) {
            return res.status(404).json({
                success: false,
                error: 'Customer list not found'
            });
        }

        list.customers.push(customerId);
        await list.save();

        res.status(200).json({
            success: true,
            data: list
        });
    } catch (error) {
        console.error('Error adding customer to customer list:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add customer to customer list'
        });
    }
};
