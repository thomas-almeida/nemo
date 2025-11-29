export const whatsInsideIn = (bookText, owner, name) => `
quais as informações cruciais desse book?, me retorne no seguinte modelo em JSON:

{
    "info": {
        "name": "${name}(deixe esse objeto exatamente como está, só tire esse parenteses no final)",
        "address": "Endereço do empreendimento",
        "developer": "Incorporadora do empreendimento",
        "company": "Empresa do empreendimento",
        "launchDate": "Data de lançamento do empreendimento (mes/ano)",
        "releaseDate": "Data de entrega prevista do empreendimento (mes/ano)",
        "details": "Detalhes que achar relevante do empreendimento (resuma em poucas linhas que eu possa enviar para um cliente no whatsapp)"
    },
    "units": [
        {
            "footage": "Metragem do imóvel (INSIRA APENAS UMA UNICA METRAGEM POR OBJETO, SEMPRE!)",
            "price": "Preço do imóvel (se houver)"
        }
    ],
    "location":[
        {
            "name": "Nome do local",
            "distance": "valor da distancia (exemplo: 9 minutos ou 100 metros")
        },
    ],
    "type": ["HIS" | "HMP" | "NR" | "R2V"] (pode ter uma delas ou varias entao verifique as topologias!),
    "owner": [
        {
            "id": ${owner} (deixe esse objeto exatamente como está)",
            "role": "ADMIN"
        },
    "attachments": [],
    "createdAt": "Data e hora de hoje",
    "customersLists": [],
    "copyMessages": [],
}

⚠️ REGRAS IMPORTANTES:
- SOMENTE retorne JSON puro.
- Não explique nada.
- Não inclua comentários.
- Caso algum dado não exista no PDF, deixe como string vazia "" ou [].

📘 Book:
"${bookText}"
`