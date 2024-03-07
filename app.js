const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const dbpath = path.join(__dirname, 'covid19IndiaPortal.db')
const app = express()
app.use(express.json())

let db = null

const intializedbserver = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server running on localhost 3000')
    })
  } catch (e) {
    console.log(e.message)
    process.exit(1)
  }
}

intializedbserver()

const camelforstate = list => {
  return {
    stateId: list.state_id,
    stateName: list.state_name,
    population: list.population,
  }
}

///AUTH

const authentication = (request, response, next) => {
  let jwttokenu
  const authheader = request.headers['authorization']
  if (authheader !== undefined) {
    jwttokenu = authheader.split(' ')[1]
    if (jwttokenu === undefined) {
      respond.status(401)
      response.send('Invalid JWT Token')
    } else {
      jwt.verify(jwttokenu, 'SECRETKEY', async (error, payload) => {
        if (error) {
          respond.status(401)
          response.send('Invalid JWT Token')
        } else {
          next()
        }
      })
    }
  }
}

///LOGIN

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const userfindquery = `
  SELECT * FROM user WHERE username="${username}"`
  const userfind = await db.get(userfindquery)
  if (userfind === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const ismatch = await bcrypt.compare(password, userfind.password)
    if (ismatch === true) {
      const payload = {
        username: username,
      }
      const jwttoken = await jwt.sign(payload, 'SECRETKEY')
      response.send({jwttoken})

      response.status(200)
      response.send('Successful login of the user')
    } else {
      response.status(401)
      response.send('Invalid password')
    }
  }
})

///GET

app.get('/states/', authentication, async (request, response) => {
  const getstatequery = `
  SELECT * FROM state 
  `
  const stateslist = await db.all(getstatequery)

  response.send(
    stateslist.map(each => {
      return camelforstate(each)
    }),
  )
})

///GET BY ID

app.get('/states/:stateId/', authentication, async (request, response) => {
  const {stateId} = request.params
  const getidquery = `
  SELECT * FROM state
  WHERE state_id="${stateId}"
  `
  const statebyid = await db.get(getidquery)
  response.send(camelforstate(statebyid))
})

///POSTDISTRICT

app.post('/districts/', authentication, async (request, response) => {
  const distnames = request.body
  const {districtName, stateId, cases, cured, active, deaths} = distnames
  const disquery = `
  INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
  VALUES(
    "${districtName}",
    "${stateId}",
    "${cases}",
    "${cured}",
    "${active}",
    "${deaths}"
    
    )
  `
  const posteddist = await db.run(disquery)
  response.send('District Successfully Added')
})

///GET DIST

app.get(
  '/districts/:districtId/',
  authentication,
  async (request, response) => {
    const {districtId} = request.params
    const getdisidquery = `
  SELECT * FROM district
  WHERE district_id="${districtId}"
  `
    const disbyid = await db.get(getdisidquery)

    const cameldist = listi => {
      return {
        districtId: listi.district_id,
        districtName: listi.district_name,
        stateId: listi.state_id,
        cases: listi.cases,
        cured: listi.cured,
        active: listi.active,
        deaths: listi.deaths,
      }
    }
    response.send(cameldist(disbyid))
  },
)

///DELETE

app.delete(
  '/districts/:districtId/',
  authentication,
  async (request, response) => {
    const {districtId} = request.params
    const dltdistquery = `
  DELETE FROM 
  district 
  WHERE district_id="${districtId}"


  `

    const dltdist = await db.run(dltdistquery)
    response.send('District Removed')
  },
)

///PUT DISTRICT

app.put(
  '/districts/:districtId/',
  authentication,
  async (request, response) => {
    const {districtId} = request.params
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const putdistquery = `
  UPDATE district 
  SET
  district_name="${districtName}",
  state_id="${stateId}",
  cases="${cases}",
  cured="${cured}",
  active="${active}",
  deaths="${deaths}"

  WHERE district_id="${districtId}"
  
  
  `
    const putdist = await db.run(putdistquery)
    response.send('District Details Updated')
  },
)

///GET STS

app.get(
  '/states/:stateId/stats/',
  authentication,
  async (request, response) => {
    const {stateId} = request.params
    const statsquery = `
  SELECT 
  SUM(cases) AS totalCases,
  SUM(cured) AS totalCured,
  SUM(active) AS totalActive,
  SUM(deaths) AS totalDeaths
   FROM 
   district 
   WHERE state_id="${stateId}"

  `
    const statss = await db.get(statsquery)
    response.send(statss)
    console.log(statss)
  },
)

app.get(
  '/districts/:districtId/details/',
  authentication,
  async (request, response) => {
    const {districtId} = request.params
    const detailstateidquery = `
  SELECT state_id 
  FROM district 
  WHERE district_id="${districtId}"
  
  `
    const stateiid = await db.get(detailstateidquery)

    const detailstatenamequery = `
 SELECT state_name AS stateName 
 FROM state 
 WHERE state_id="${stateiid.state_id}"

 `
    const staename = await db.get(detailstatenamequery)
    response.send(staename)
  },
)

module.exports = app
