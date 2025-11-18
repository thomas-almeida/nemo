import Customer from "../models/Customer.js";

export const createCustomer = async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                error: "Nome e telefone são obrigatórios"
            });
        }

        const customer = await Customer.create({ name, phone });

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
        const { id } = req.params;
        const customer = await Customer.findById(id);

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
        console.error("Erro ao buscar cliente:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao buscar cliente"
        });
    }
};

