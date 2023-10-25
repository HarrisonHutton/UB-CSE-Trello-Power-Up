export type IssueData = {
    action: string,
    trelloUsername: string,
    shortCardNumber: string,
    boardShortUrl: string,
}

export function sendIssue(issueData: IssueData) {
    console.log('Sending issue...', issueData);
    console.log('Length:', JSON.stringify(issueData).length.toString());
    fetch(`${Bun.env.PMTOOL_API_URL}/api/bbcontroller.php`, {
        method: 'POST',
        body: JSON.stringify(issueData),
        headers: {
            'Content-Type': 'application/json',
        }
    }).then(res => {
        console.log(res);
        if (res.status === 200) {
            return res.json();
        } else {
            console.log(res.status);
            console.log('Status not okay!');
            return null;
        }
    }).then(data => {
        if (data) {
            console.log('Issue sent!', data);
        }
        else {
            console.log('Received null data');
        }
    }).catch(err => {
        console.log('Issue failed to send!', err);
    });
}