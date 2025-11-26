import Customer from "../models/Customer.js";

export const createCustomer = async (req, res) => {
    try {
        const { name, phone, userId } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                error: "Nome e telefone são obrigatórios"
            });
        }

        const customer = await Customer.create({ name, phone, owner: userId });

        res.status(201).json({
            success: true,
            data: customer
        });
    } catch (error) {
        console.error("Erro ao criar cliente:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao criar cliente"
        });
    }
};

export const getCustomerById = async (req, res) => {
    try {
        const { id, userId } = req.params;
        const customer = await Customer.findById(id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                error: "Cliente não encontrado"
            });
        }

        if (customer.owner !== userId) {
            return res.status(403).json({
                success: false,
                error: "Cliente não encontrado na sua carteira"
            });
        }

        res.status(200).json({
            success: true,
            data: customer
        });
    } catch (error) {
        console.error("Erro ao buscar cliente:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao buscar cliente"
        });
    }
}



/**
 * Get all customers for the specified user ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllCustomers = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "ID do usuário não fornecido"
            });
        }

        // Find customers where the owner field matches the provided userId
        const customers = await Customer.find({ owner: userId })

        res.status(200).json({
            success: true,
            data: customers
        });
    } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao buscar clientes"
        });
    }
}

export const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verifica se o cliente existe
        const existingCustomer = await Customer.findById(id);
        
        if (!existingCustomer) {
            return res.status(404).json({
                success: false,
                error: "Cliente não encontrado"
            });
        }

        // Remove campos que não devem ser atualizados
        const { owner, _id, __v, ...updateData } = req.body;
        
        // Atualiza apenas os campos que foram fornecidos no body
        const updatedCustomer = await Customer.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: updatedCustomer
        });
    } catch (error) {
        console.error("Erro ao atualizar cliente:", error);
        
        // Melhora as mensagens de erro de validação
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: `Erro de validação: ${error.message}`
            });
        }
        
        res.status(500).json({
            success: false,
            error: "Erro ao atualizar cliente: " + error.message
        });
    }
}

export const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await Customer.findByIdAndDelete(id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                error: "Cliente não encontrado"
            });
        }

        res.status(200).json({
            success: true,
            data: customer
        });
    } catch (error) {
        console.error("Erro ao deletar cliente:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao deletar cliente"
        });
    }
}
