var client;
document.onreadystatechange = function () {
  if (document.readyState === "complete") {
    app.initialized()
      .then(function (_client) {
        client = _client;
        client.events.on("app.activated", appActivated);
        client.instance.receive(receiveMessageFromModal);
      });
  }
}
async function receiveMessageFromModal(event) {
  try {
    $("#proceedToDc-btn").hide();
    $("#loader").removeClass('hide');
    $("#progress").prop("value", "DC generation is currently in progress. Please wait.").removeClass('hide');
    const data = event.helper.getData().message;
    const { response: { generatedSequenceNumber } } = await client.request.invoke("generateSequenceNumber", { regionCode: data.region });
    const payload = {
      ticketId: data.ticketId,
      dcCreatedDate: data.dcCreatedDate,
      dtCode: data.dtCode,
      dtName: data.dtName,
      selectedAssets: data.selectedAssets,
      generatedSequenceNumber
    };
    const resp = await client.request.invoke("initiateDC", payload);
    $("#loader,#progress").addClass('hide');
    $("#progress").prop("value", "DC has been generated. Please refresh the page.").removeClass('hide');
    showNotification("success", "DC Generated Successfully");
    console.log(resp);
  }
  catch (err) {
    console.log(err)
    $("#progress,#loader").addClass('hide');
    $("#warningLabel").prop("value", "Failed to Generate DC, Please try again later.").removeClass('hide');
    showNotification("danger", "Failed to Generate DC, Please try again later");
  }
}
async function appActivated() {
  try {
    $("#proceedToDc-btn,#dcDetails").hide()
    $("#loader").removeClass('hide');//
    $("#warningLabel,#progress").addClass('hide');
    const { ticket: ticketData } = await client.data.get("ticket");
    const ticketType = ticketData.custom_fields.cf_ticket_type;

    if (ticketType !== 'Delivery Challan') {
      $("#warningLabel").prop("value", "Ticket Type is not Delivery Challan").removeClass('hide');
      $("#loader").addClass('hide');
      return;
    }

    const { contact: contactData } = await client.data.get("contact");
    const dcStatus = ticketData.custom_fields.cf_dc_status;
    const dcNumber = ticketData.custom_fields.cf_dc;
    const emailID = contactData.email;
    const dcCreatedDate = ticketData.created_at
    if (dcStatus === 'Not Generated' || dcStatus === null) {
      await handleNotGeneratedDeliveryChallanTicket(emailID, ticketData.id, dcCreatedDate);
    } else {

      const dcSubmittedTime = ticketData.custom_fields.cf_dc_submitted_date;
      const dtCode = ticketData.custom_fields.cf_dt_code
      await handleGeneratedDeliveryChallanTicket(dcNumber, dcCreatedDate, dcSubmittedTime, dcStatus, dtCode, emailID);
    }
  } catch (error) {
    $("#loader").addClass('hide');
    showNotification("danger", "App Activation Failed.");
    console.error("App Activation Failed due to:", error);
  }
}
async function handleNotGeneratedDeliveryChallanTicket(emailID, ticketId, dcCreatedDate) {
  try {
    const salesAccount = await getAccountDetailsByEmail(emailID);
    if (!salesAccount) {
      $("#warningLabel").prop("value", "This contact's Sales Account was not found").removeClass('hide');
      $("#loader").addClass('hide');
      return;
    }
    $("#loader").addClass('hide');
    const dtCode = salesAccount.custom_field.cf_dt_code;
    const dtName = `${salesAccount.custom_field.cf_partner_first_name} ${salesAccount.custom_field.cf_distributor_retailer_last_name}`;
    const region = salesAccount.custom_field.cf_states;
    const { assets_max_select_limit: assetsLimit } = await client.iparams.get("assets_max_select_limit")
    $("#proceedToDc-btn").show().off().click(() => {
      client.interface.trigger('showModal', { title: 'Assets', template: 'assets.html', data: { ticketId, assetsLimit, dcCreatedDate, dtCode, dtName, region, usecase: "select" } });
    });
  }
  catch (error) {
    console.error("Failed to handle not generated delivery challan ticket", error)
  }
}

async function handleGeneratedDeliveryChallanTicket(dcNumber, dcCreatedDate, dcSubmittedTime, dcStatus, dtCode, emailID) {
  $("#loader").addClass('hide');
  $("#dcNum").text(dcNumber)
  $("#dcStatus").text(dcStatus)
  $("#dcCreated").text(moment.utc(dcCreatedDate, "YYYY-MM-DD HH:mm:ss").utcOffset('+0530').format('YYYY-MM-DD hh:mm:ss A'))
  $("#dcSubmitted").text(dcSubmittedTime)
  $("#dtCode").text(dtCode)
  $("#dcDetails").show()
  $("#dcAssetsView-btn").off().click(() => {
    client.interface.trigger('showModal', { title: 'Assets', template: 'assets.html', data: { dcNumber, emailID, dcSubmittedTime, usecase: "view" } });
  });
}

function showNotification(type, message) {
  client.interface
    .trigger("showNotify", {
      type: type,
      message: message,
    })
    .catch(function (error) {
      console.log(error);
    });
}


async function getAccountDetailsByEmail(email) {
  try {
    const res = await client.request.invokeTemplate("getDtcode", {
      context: { id: encodeURIComponent(email) }
    });

    const salesAccounts = JSON.parse(res.response).sales_accounts.sales_accounts;
    const salesAccount = salesAccounts[0];

    return salesAccount;
  } catch (error) {
    console.error("Error while getting Sales Account details:", error);
    throw error;
  }
}

