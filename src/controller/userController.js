import User from "../models/User.js"

export const createUser = async (req, res) => {
    try {
        const { username, email } = req.body;
        if (!username || !email) {
            return res.status(400).json({
                success: false,
                error: "Nome e email são obrigatórios"
            });
        }
        const user = await User.create({ username, email });
        res.json({
            success: true,
            user,
            message: "Usuário criado com sucesso"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Falha ao criar usuário"
        });
    }
}
