var express = require('express');
var axios = require('axios');
var app = express();
var cors = require('cors');

var jiraBaseURL = "https://AAAAAAAAAAAAAAAAA.atlassian.net";
//PREENCHA AQUI O SEU TOKEN DE AUTENTICAÇÃO
var basicAuthToken = "Basic AAAAAAAAAAAAAAAAAAAAAAAAAAA=";
//PREENCHA AQUI O ALIAS DO PROJETO 
var project = "AAA";

app.use(cors());

app.get('/project/issues', async function (req, res) {
    try {
        const issues = await getProjectIssues();
        res.send(issues);

    } catch (error) {
        console.log(error);
    }
});

app.get('/issues', async function (req, res) {
    try {
        const issues = await getIssues();
        res.send(issues);

    } catch (error) {
        console.log(error);
    }
});

async function getIssues() {    
    // PREENCHA AQUI O ARRAY DE ISSUES QUE VOCÊ QUER CONSULTAR
    // EX:
    const issues = ["AAA-729","AAA-724","AAA-720","AAA-717"];
    //const issues = [];
    
    var data = issues.map(async item => {
        const response = await axios.get(`${jiraBaseURL}/rest/api/latest/issue/${item}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    "cookie": "atlassian.xsrf.token=c365bc95-3f28-44a7-bf9a-edb59417c9b0_7c7a3959f454f5729cea04197f6ef4b675ee4807_lin",
                    "content-length": "0",
                    "authorization": `${basicAuthToken}`
                }
            }
        )        
        
        const issue = {};
        issue.key = response.data.key;
        issue.id = response.data.id;
        issue.created = response.data.fields.created;
        issue.resolutionDate = response.data.fields.resolutiondate;
        issue.type = response.data.fields.issueType != null ? response.data.fields.issueType.name : "";
        issue.summary = response.data.fields.summary;
        issue.assignee = {};
        issue.assignee.displayName = response.data.fields.assignee != null ? response.data.fields.assignee.displayName : "";
        issue.assignee.avatarUrl = response.data.fields.assignee != null ? response.data.fields.assignee.avatarUrls['32x32'] : "";
        
        issue.history = await getIssueHistory(response.data.key);
        issue.startDate = await getIssueStartDate(response.data.key);
        issue.startDate = issue.startDate == "" ? issue.created : issue.startDate; 
        
        const end = new Date(issue.resolutionDate);
        const create = new Date(issue.created);
        const start = new Date(issue.startDate);

        const leadtime = Math.abs(end.getTime() - create.getTime());    
        issue.leadtime = leadtime / (1000 * 60 * 60 * 24); 

        const cycletime = Math.abs(end.getTime() - start.getTime());    
        issue.cycletime = cycletime / (1000 * 60 * 60 * 24); 

        const reactiontime = Math.abs(start.getTime() - create.getTime());    
        issue.reactiontime = reactiontime / (1000 * 60 * 60 * 24); 

        return issue;
    })     
   
    return Promise.all(data);
}

async function getProjectIssues() {    
    const response = await axios.get(`${jiraBaseURL}/rest/api/latest/search?jql=project=${project}`,
        {
            headers: {
                'Content-Type': 'application/json',
                "cookie": "atlassian.xsrf.token=c365bc95-3f28-44a7-bf9a-edb59417c9b0_7c7a3959f454f5729cea04197f6ef4b675ee4807_lin",
                "content-length": "0",
                "authorization": `${basicAuthToken}`
            }
        }
    )        
    
    var issues = response.data.issues.filter((item) => {
        return item.fields.resolutiondate != undefined
    });     

    var data = issues.map(async item => {
        if (item.fields.resolutiondate)
        {   
            const issue = {};
            issue.key = item.key;
            issue.status = item.fields.status.name;
            issue.created = item.fields.created;
            issue.resolutiondate = item.fields.resolutiondate;
            issue.link = item.self;
            issue.summary = item.fields.summary;
            issue.assignee = {};
            issue.assignee.displayName = item.fields.assignee != null ? item.fields.assignee.displayName : "";
            issue.assignee.avatarUrl = item.fields.assignee != null ? item.fields.assignee.avatarUrls['32x32'] : "";
                        
            return issue;
        }
    })     
   
    return Promise.all(data);
}

function getIssueHistory(key) {
    const issueHistory = axios.get(`${jiraBaseURL}/rest/api/latest/issue/${key}?expand=changelog`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    "cookie": "atlassian.xsrf.token=c365bc95-3f28-44a7-bf9a-edb59417c9b0_7c7a3959f454f5729cea04197f6ef4b675ee4807_lin",
                    "content-length": "0",
                    "authorization": `${basicAuthToken}`
                }
            }
        )           
        .then(response => {
            let history = [];

            response.data.changelog.histories.forEach((i) => 
            {   
                if (i.items[0].field == "status")
                history.push({
                    status : i.items[0].toString,
                    date : i.created       
                });         
            });

            return history;
        })
        .catch(exception => 
        {
            console.log(exception);
        }); 

    return issueHistory;
}

function getIssueStartDate(key) {
    const issueHistory = axios.get(`${jiraBaseURL}/rest/api/latest/issue/${key}?expand=changelog`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    "cookie": "atlassian.xsrf.token=c365bc95-3f28-44a7-bf9a-edb59417c9b0_7c7a3959f454f5729cea04197f6ef4b675ee4807_lin",
                    "content-length": "0",
                    "authorization": `${basicAuthToken}`
                }
            }
        )           
        .then(response => {
            //let history = [];
            var startDate = "";

            response.data.changelog.histories.forEach((i) => 
            {   
                if (i.items[0].field == "status" && i.items[0].toString == "Em Progresso")
                {
                    if ((startDate == "") || (startDate != "" && i.created < startDate))
                    {
                        startDate = i.created                        
                    }                         
                }
            });

            return startDate;
        })
        .catch(exception => 
        {
            console.log(exception);
        }); 

    return issueHistory;
}

app.listen(3333, function () {
});