import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import "bootstrap/js/dist/scrollspy";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/carousel";
import "bootstrap/js/dist/alert";
import { alertTimeout } from "./helper.js"
require("./polygons");
require("../css/style.scss");

const toggleNL = (remove = false) => {
  document.getElementById("nlbtn").disabled = remove ? "" : "disabled";
  document.getElementById("nlbtn").innerHTML = remove ? "Subscribe" : "Loading";
  document
    .getElementById("mc-embedded-subscribe-form")
    .classList.toggle("half-transparent");
};

(function () {
  const newsletterForm = document.querySelector("#mc-embedded-subscribe-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const email = document.querySelector("#newsletter_email").value.trim();
      if (email) {
        toggleNL();
        fetch("/newsletter-signup", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({ email }) // data can be `string` or {object}!
        })
          .then(res => res.json())
          .then(response => {
            const nlHeadline = document.getElementById("nlheadline");

            if (response.code === 200) {
              nlHeadline.innerHTML = response.message;
            } else if (response.code === 422) {
              toggleNL(true);
              nlHeadline.innerHTML =
                "User already in list, check your mails for a existing verification mail";
            }
          })
          .catch(error => {
            console.error("Error:", error);
          });
      }
    });
  }
})();

let counted = false;
const countUp = () => {
  const counter = document.querySelector(".section-counter");

  if (counter && elementInViewport(counter) && !counted) {
    counted = true;
    $(".counter-count").each(function () {
      $(this)
        .prop("Counter", 0)
        .animate(
          {
            Counter: $(this).text()
          },
          {
            duration: 5000,
            easing: "swing",
            step: function (now) {
              $(this).text(Math.ceil(now));
            }
          }
        );
    });
  }
};

const scrollbuttons = document.getElementsByClassName("scrollbutton");
for (let i = 0, len = scrollbuttons.length; i < len; i++) {
  scrollbuttons[i].addEventListener("click", function (event) {
    event.preventDefault();
    document.querySelector(event.target.attributes.href.value).scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest"
    });
  });
}
const throttle = (func, limit) => {
  let lastFunc;
  let lastRan;
  return function () {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function () {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

const floatings = [...document.querySelectorAll(".floatings")];

function showFloatings() {
  let timeout = 0;
  floatings.forEach(item => {
    if (elementInViewport(item) && window.innerWidth > 576) {
      setTimeout(() => {
        item.classList.add("floated");
      }, timeout);
      timeout += 150;
    }
  });
}

function elementInViewport(el) {
  let top = el.offsetTop;
  let left = el.offsetLeft;
  let width = el.offsetWidth;
  let height = el.offsetHeight;

  while (el.offsetParent) {
    el = el.offsetParent;
    top += el.offsetTop;
    left += el.offsetLeft;
  }

  return (
    top < window.pageYOffset + window.innerHeight - window.innerHeight / 5 &&
    left < window.pageXOffset + window.innerWidth &&
    top + height > window.pageYOffset &&
    left + width > window.pageXOffset
  );
}

window.onscroll = throttle(function () {
  showFloatings();
  countUp();
}, 50);

$("#contactFormModal").on("shown.bs.modal", function (e) {
  window.document.querySelector("#track").value = window.location.href;
  window.history.replaceState(window.location.pathname, "/", `/contact`);
});

$("#contactFormModal").on("hidden.bs.modal", function (e) {
  window.document.querySelector("#track").value = "";
  window.history.replaceState({}, "/", window.history.state);
});
// $('[data-spy="scroll"]').on('activate.bs.scrollspy', function () {
//   console.debug("yo")
// })
const getFileElements = document.querySelectorAll("[type='file']");
getFileElements.forEach(el => {
  el.addEventListener("change", () => {
    const Filetype = el.files[0].type;
    let alert = document.querySelector("#invalidFile");
    if (
      Filetype !== "application/pdf" &&
      Filetype !== "image/jpeg" &&
      Filetype !== "image/png" &&
      Filetype !== "image/jpg" &&
      Filetype !== "image/svg+xml"
    ) {
      el.value = "";
      alert ? alert.remove() : null;
      let newItem = document.createElement("div");
      newItem.innerHTML = `<div id="invalidFile" class="alert alert-danger" role="alert">
                             This field not accept ${Filetype}
                            </div>`;

      function insertAfter(el, referenceNode) {
        referenceNode.parentNode.insertBefore(el, referenceNode);
      }

      insertAfter(newItem, el);
    }
    alert ? alert.remove() : null;
  });
});

function objectToCsv(data) {
  const csvRows = [];
  const headers = Object.keys(data[0]);
  csvRows.push(headers.join(";"));
  for (const row of data) {
    const values = headers.map(header => {
      const escaped = !!row[header]
        ? "" + row[header].toString().replace(/"/g, '\\"')
        : "";
      return `"${escaped}"`;
    });
    csvRows.push(values.join(";"));
  }
  return csvRows.join("\n");
}

function downloadCsv(data) {
  const blob = new Blob([data], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("id", "csv");
  a.setAttribute("hidden", "");
  a.setAttribute("href", url);
  a.setAttribute("download", "CSVDownloadOfLeads.csv");
  document.body.appendChild(a);
  a.click();
  a.removeChild(a);
}

$("#downloadCSV").on("click", function (e) {
  fetch("/admin/contacts/api-json")
    .then(resp => resp.json())
    .then(data => {
      let leads = data
        .map(lead => ({
          ...lead,
          utm_params: lead.utm_params ? JSON.stringify(lead.utm_params) : "",
          locations: lead.locations && lead.locations[0] ? lead.locations[0].name : ""
        }));
      console.log('leads', leads);
      let csvRow = objectToCsv(leads);
      downloadCsv(csvRow);
    })
    .catch(error => console.log("error ===>", error));
});
$("#curriculumpopup").on('show.bs.modal', function (e) {
  e.target.querySelector('form').dataset.course = e.relatedTarget.dataset.course
});
Array.from(document.querySelectorAll(".ajaxform")).map(form => {
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    e.target.querySelector('button').disabled = true;
    e.target.querySelector('#contactform_text').classList.add("d-none")
    e.target.querySelector('#contactform_spinner').classList.remove("d-none")
    let payload = Array.from(e.target.elements)
      .filter(i => i.type !== "submit")
      .reduce((acc, el) => ({ ...acc, [el.name]: el.type === "checkbox" ? el.checked : el.name === "jobcenter" ? !!Number(el.value) : el.value }), {})
    payload = { ...payload, course: e.target.dataset.course }

    if (localStorage.getItem('dcianswers')) {
      payload.answers = JSON.parse(localStorage.getItem('dcianswers'))
    }
    fetch(e.target.action, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(data => data.json()).then(data => {
        e.target.querySelector('#contactform_spinner').classList.add("d-none")
        e.target.querySelector('#contactform_check').classList.remove("d-none")
        Array.from(e.target.elements).map(i => (i.value = "", i.style.boxShadow = "none"))
        const flashMessage = document.createElement('div')
        flashMessage.classList.add("flash", "m-0", "mr-3", "alert", "fade", "show", "alert-success")

        flashMessage.innerHTML = `${data.response.message}<button class="close ml-3" type="button" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button>`
        document.body.appendChild(flashMessage)
        setTimeout(() => {
          $(".alert").alert("close");
        }, alertTimeout || 5000);
        if (data.response.filepath) {
          window.open(`${window.location.origin}/images/${data.response.filepath}`, '_blank')
        }
      })
      .catch(error => {
        e.target.querySelector('button').disabled = false;
        console.error(error)
      });
  })
})

window.onload = function () {
  showFloatings();
  const errorContainer = document.querySelector(".cont_principal")
  if (errorContainer) {
    errorContainer.className = "cont_principal cont_error_active";
  }
};
//
// let typedCursor = new Typed('.subtitle', {
//   strings: ["Learn digital skills with us to get the most fulfilling jobs."],
//   typeSpeed: 30,
//   loop: true
// });
// console.log(typedCursor)


function stickyNavigation(element) {
  const nav = document.querySelector('nav.navbar');
  if (window.scrollY >= element.offsetHeight / 2) {
    nav.classList.add('bg-white');
  } else {
    nav.classList.remove('bg-white');
  }
}

const notFoundTimer = document.querySelector('.timerRedirect')
if (notFoundTimer) {
  let counter = 5
  setInterval(function () {
    if (counter > -1) {
      counter -= 1
      notFoundTimer.innerHTML = counter + ' '
      if (counter === 0) {
        window.location.replace('/')
      }
    }
  }, 1000);
}

const jobcenterSelect = document.querySelector('.jobcenter-location-select')
if (jobcenterSelect) {
  jobcenterSelect.addEventListener('change', (e) => {
    document.getElementById('jobcenter_address').innerText = e.target.selectedOptions[0].dataset.address
    Array.from(document.querySelectorAll('.jobcenter-location-employee')).map(j => {
      if (!JSON.parse(j.dataset.location).includes(e.target.selectedOptions[0].innerText)) {
        j.classList.add('hidden')
      } else {
        j.classList.remove('hidden')
      }
    })
  })
}
const questionroot = document.getElementById("questionroot")
const findAnswers = (question, model) => {
  const answers = Object.values(model.layers.find(layer => layer.type === "diagram-nodes").models)
    .filter(links => Object.values(model.layers.find(layer => layer.type === "diagram-links").models)
      .filter(layer => layer.source === question.id).map(l => l.target).includes(links.id))

  answers.filter(answer => answer.extras && !!answer.extras.freequestion)
  if (!!answers.filter(answer => answer.extras && !!answer.extras.freequestion).length) {

  }

  questionroot.innerHTML = `
    <div>
      <div id="popup" class="py-3 d-flex flex-column justify-content-between w-300px align-items-center">
        <div class="d-flex align-items-start">
          <h4 class="mr-3">${question.name}</h4>
          <button class="close ml-3" type='button' data-dismiss='alert' aria-label='Close'>
            <span class="pointer-events-none" aria-hidden='true'>
              ×
            </span>
          </button>
        </div>
        <div class="">
          ${!answers.filter(answer => answer.extras && !!answer.extras.freequestion).length ? answers.map(answer => {
      return `<button class="btn btn-primary mr-2 answerbutton" data-question="${question.name}" data-answer="${answer.id}">${answer.name}</button>`
    }).join('') : `
            <input class="form-control" name="freequestion" type="text" data-type="question" id="freequestion" />
            <button class="btn btn-primary mr-2 answerbutton" data-answer="${answers[0].id}" data-question="${question.name}">Next</button>
          `}
        </div>
      </div>
    </div>`
}

if (questionroot && !localStorage.getItem('dcianswers')) {
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains("close")) {
      questionroot.innerHTML = ""
    }
  })
  fetch(`/admin/questions/fetch`, {
    headers: {
      "content-type": "application/json"
    },
  }).then(res => res.json())
    .then(res => {
      const diagramNodes = res.payload.model.layers.find(layer => layer.type === "diagram-nodes").models
      const links = res.payload.model.layers.find(layer => layer.type === "diagram-links").models
      const startquestion = Object.values(diagramNodes).find(model => model.ports.find(port => port.label === "In").links.length === 0)
      document.addEventListener('click', (e) => {
        if (e.target.classList.contains("answerbutton")) {
          const freequestion = document.getElementById('freequestion')
          localStorage.setItem('dcianswers', JSON.stringify({ ...JSON.parse(localStorage.getItem('dcianswers')), [e.target.dataset.question]: freequestion ? freequestion.value : e.target.innerText }))

          const currentAnswer = diagramNodes[e.target.dataset.answer]
          var linkToNext = links[currentAnswer.ports.find(port => port.name === "Out").links[0]]
          if (linkToNext) {
            const nextQuestion = Object.values(diagramNodes).find(model => model.id === linkToNext[linkToNext.target === currentAnswer.id ? "source" : "target"])
            findAnswers(nextQuestion, res.payload.model)
          } else {
            let payload = JSON.parse(localStorage.getItem('dcianswers'))
            fetch(`/submitanswers`, {
              method: "POST",
              headers: {
                "content-type": "application/json"
              },
              body: JSON.stringify(payload)
            }).then(res => res.json())
              .then(res => {
                questionroot.querySelector('#popup').innerHTML = `<h2>Thanks</h2>`
                setTimeout(() => {
                  questionroot.innerHTML = ``
                }, 2000);
                localStorage.clear('dcianswers')
              })
          }
        }
      })
      console.log(startquestion);
      findAnswers(startquestion, res.payload.model)
    })
}
