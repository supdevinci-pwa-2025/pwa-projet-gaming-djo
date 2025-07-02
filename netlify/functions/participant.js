exports.handler = async (event) => {
  const participant = JSON.parse(event.body);

  if (!participant.name || !participant.role) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Il manque le nom ou le role !" }),
    };
  }

  console.log("participant reçu via Background Sync :", participant);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "participant bien reçu !" }),
  };
};
