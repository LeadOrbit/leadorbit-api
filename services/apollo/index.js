const { default: axios } = require("axios");
const { headers } = require("../../config/apollo.io.config");

function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname;

    // Remove subdomains (like www, mail, etc.)
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.'); // Get the last two segments
    }

    return hostname;
  } catch (err) {
    console.error("Invalid URL:", url);
    return '';
  }
}

async function findPersonOnApollo(filterString, source, organization_locations) {
  try {

    const res = await axios.post(
      'https://app.apollo.io/api/v1/mixed_people/search',

      {
        "page": 1, "sort_ascending": false, "sort_by_field": "[none]", "q_keywords": `${filterString}`, "person_seniorities": [
          "owner",
          "vp",
          "founder",
          "c_suite"
        ], "organization_locations": organization_locations,
        "organization_num_employees_ranges": ["1,10", "11,20", "21,50", "51,100"], "contact_email_status_v2": ["verified"], "display_mode": "explorer_mode", "per_page": 25, "open_factor_names": [], "num_fetch_result": 1, "context": "people-index-page", "show_suggestions": false, "include_account_engagement_stats": false, "include_contact_engagement_stats": false, "finder_version": 2, "search_session_id": "cbdd425b-1ea4-4092-a8a0-d91645ca48df", "fields": ["id", "name", "contact_job_change_event", "call_opted_out", "title", "account", "organization_id", "intent_strength", "organization_name", "account.id", "account.organization_id", "account.domain", "account.logo_url", "account.name", "account.facebook_url", "account.linkedin_url", "account.twitter_url", "account.crm_record_url", "account.website_url", "label_ids", "linkedin_url", "emailer_campaign_ids", "phone_numbers", "sanitized_phone", "contact_emails", "direct_dial_status", "direct_dial_enrichment_failed_at", "email", "email_status", "free_domain", "email_needs_tickling", "email_status_unavailable_reason", "email_true_status", "email_domain_catchall", "failed_email_verify_request", "flagged_datum", "city", "state", "country", "account.estimated_num_employees", "account.industries", "account.keywords", "contact.6797838f6c8f4001b0fc28e3"], "ui_finder_random_seed": "14p2tgdebpy", "typed_custom_fields": ["6797838f6c8f4001b0fc28e3"], "cacheKey": 1744143308446
      }
      ,
      {
        headers: headers
      }
    );
    const contacts = res.data.contacts;
    const people = res.data.people;
    console.log("People", people)
    console.log("contacts", contacts)

    if (!people.length && !contacts.length) return null;

    const getCpmparisonString = (p, type) => {
      let comparisionString = ''
      if (source === "nasdaq") {
        if (type === "contact") {
          comparisionString = p.account.name;
        } else {
          comparisionString = p.organization.name;
        }
      } else {
        if (type === "contact") {
          comparisionString = p.account.name?.trim()
        } else {
          comparisionString = p.organization.name?.trim()
        }
      }
      console.log("source", source);
      console.log("filterString", filterString.trim())
      console.log("comparisionString", comparisionString);
      return comparisionString;
    }


    if (contacts.length > 0) {
      return contacts.filter(fp => getCpmparisonString(fp, "contact") === filterString.trim() && fp.email_status === "verified" && fp.linkedin_url != 'N/A' && fp.linkedin_url != '').map((p) => ({
        id: p.person_id,
        name: p.name,
        title: p.title,
        linkedin: p.linkedin_url,
        "city": p.city,
        "state": p.state,
        "country": p.country,
        organization: {
          id: p.account.organization_id,
          name: p.account.name,
          estimated_num_employees: p.account.estimated_num_employees,
          website_url: p.account.website_url,
          industry: p.account.industries.join(',')
        }

      }));

    } else if (people.length > 0) {
      return people.filter(fp => getCpmparisonString(fp, "people") === filterString.trim() && fp.email_status === "verified" && fp.linkedin_url != 'N/A' && fp.linkedin_url != '').map((p) => ({
        id: p.id,
        name: p.name,
        title: p.title,
        linkedin: p.linkedin_url,
        "city": p.city,
        "state": p.state,
        "country": p.country,
        organization: {
          id: p.organization.id,
          name: p.organization.name,
          estimated_num_employees: p.organization.estimated_num_employees,
          website_url: p.organization.website_url,
          industry: p.organization.industries.join(',')
        }

      }));
    }
    else {
      console.warn(`⚠️ No ${jobTitles} found for ${''}`);
      return null;
    }
  } catch (error) {
    console.log("Error at findPersonOnApollo", error);
    return null;
  }
}


async function revealEmailFromApollo(personIds) {
  try {
    const payload = {
      entity_ids: personIds,
      analytics_context: 'Searcher: Individual Add Button',
      skip_fetching_people: true,
      cta_name: 'Access email',
      cacheKey: Date.now(),
    };
    const response = await axios.post(
      'https://app.apollo.io/api/v1/mixed_people/add_to_my_prospects',
      payload,
      { headers }
    );
    //console.log("PersonIds", personIds)
    console.log('✅ Revealed contacts:', response.data.contacts);

    let temp = response.data.contacts.map(p => ({ id: p.person_id, email: p.email, email_status: p.email_status, phone: p.sanitized_phone }
    ));

    return temp;
  } catch (error) {
    console.error('❌ Error revealing email:', error.response?.data || error.message);
    throw error;
  }
}


module.exports = { findPersonOnApollo, revealEmailFromApollo }