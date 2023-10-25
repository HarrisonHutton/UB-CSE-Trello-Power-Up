function addCommentToCard(cardId: string, comment: string) {
    /* Bun's environment variables are stored in the Bun.env object. 
     * They are accessed the same way as the usual process.env method. */
    const queryParams = `?key=${Bun.env.TRELLO_API_KEY}&token=${Bun.env.TRELLO_API_TOKEN}&text=${comment}`;
    /* Make the POST request that adds a comment to the card. */
    fetch(
        `https://api.trello.com/1/cards/${cardId}/actions/comments` + queryParams, 
        { 
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
        }
    ).then( response => {
        if (response.ok) {
            console.log("Comment added to card #" + cardId);
        } else {
            console.log("Error adding comment to card #" + cardId);
        }
    })
}

export { addCommentToCard }