import { handleEnablePlugin } from "../actions/enable-plugin";
import { handleUpdateCard } from "../actions/update-card";
import { handleRemoveLabelFromCard } from "../actions/remove-label-from-card";
import { handleAddLabelToCard } from "../actions/add-label-to-card";
import { getActionType } from "../utils/action-json";

export async function handleGetBoard(req: Request) {
    const stream = req.body;

    if (stream != null) {
        /* Since the body of the request is a stream, we can't just
         * call .json() on it. Instead, we need to convert it to a
         * JSON object using the Bun.readableStreamToJSON() function. */
        const json = await Bun.readableStreamToJSON(stream);
        Bun.write('logs/getBoard.json', JSON.stringify(json));
        const actionType = getActionType(json);
        switch (actionType) {
            case "updateCard":
                await handleUpdateCard(json);
                break;
            case "removeLabelFromCard":
                handleRemoveLabelFromCard(json);
                break;
            case "addLabelToCard":
                handleAddLabelToCard(json);
                break;
            case "enablePlugin":
                handleEnablePlugin(json);
                break;
            default:
                console.log("Action type not recognized: " + actionType);
        }
    }
    return new Response(req.body);
}