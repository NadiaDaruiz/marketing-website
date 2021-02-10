require("dotenv").config({ path: __dirname + "/../.env" });
const multer = require("multer");
const uuid = require("uuid");
const fs = require("fs");
const jimp = require("jimp");
const Location = require("../../models/location");
const courseFormConfig = require("../../formsConfig/courseFormConfig")();
const AbstractController = require("./AbstractController");

const Course = require("../../models/course");
const Story = require("../../models/story");

module.exports.getCourses = async function(req, res) {
  let courses = await Course.find({})
    .sort({ order: 1 })
    .populate("language")
    .populate("languageVersion")
    .exec();
  const storys = await Story.find()
    .select("title slug")
    .exec();

  res.render("admin/adminCourses", {
    courses,
    courseFormConfig,
    storys
  });
};

module.exports.getSingleCourse = function(req, res) {
  Course.findOne({ slug: req.params.slug }, function(err, course) {
    if (course) {
      res.render("course", {
        course,
        courseFormConfig
      });
    }
    res.redirect("/admin/courses");
  });
};
module.exports.editCourse = async function(req, res) {
  try {
    const course = await Course.findOne({slug: req.params.slug})
      .populate("successStory")
      .populate("language")
      .populate("languageVersion")
      .exec();
    const storys = await Story.find()
      .select("title slug")
      .populate("language")
      .exec();
    let alllocations = await Location.find({isCampus: true}).exec();
    const all = alllocations.map(loc => {
      let match = course.locations
        .map(pcat => pcat.toString())
        .includes(loc._id.toString());
      if (match) {
        return Object.assign({ selected: true }, loc._doc);
      } else {
        return loc._doc;
      }
    });
    res.render("admin/editCourse", {
      course,
      storys,
      courseFormConfig,
      locations: all
    });
  } catch (error) {
    console.debug("error", error);
    req.flash("danger", JSON.stringify(error));
    res.redirect("/admin/courses");
  }
};
module.exports.createCourse = async function(req, res) {
  const storys = await Story.find()
    .select("title slug")
    .exec();
  var course = await new Course();
  course.headline = req.body.headline;
  course.title = req.body.title;
  course.subheading = req.body.subheading;
  course.subtitle = req.body.subtitle;
  course.order = req.body.order;
  course.locations = req.body.locations;
  course.icon = req.body.icon;
  course.subicon = req.body.subicon;
  course.coloraccent = req.body.coloraccent;
  course.massnahmeNumber = req.body.massnahmenummer;
  course.massnahmeDetails = req.body.massnahmedetails;
  course.courselength = req.body.courselength;
  course.curriculumSectionSubheading = req.body.curriculumSectionSubheading;
  course.textColor = req.body.textColor;
  course.courseLanguages = req.body.courseLanguages;
  course.startInterval = req.body.startInterval;
  course.computerKnowledge = req.body.computerKnowledge;
  course.education = req.body.education;
  course.other = req.body.other;

  if(!!req.body.successStory) {
    course.successStory = req.body.successStory;
  }

  course.archivements = [1, 2, 3, 4, 5, 6].map(item => {
    return {
      title: req.body[`archivement_title_${item}`],
      icon: req.body[`archivement_icon_${item}`],
      description: req.body[`archivement_description_${item}`]
    };
  });

  course.timeline = [1, 2, 3, 4, 5, 6].map(item => {
    return {
      title: req.body[`timeline_title_${item}`],
      subtitle: req.body[`timeline_subtitle_${item}`],
      time: req.body[`timeline_time_${item}`]
    };
  });

  course.features = [1, 2, 3, 4, 5, 6].map(item => {
    return {
      icon: req.body[`features_icon_${item}`],
      subtitle: req.body[`features_subtitle_${item}`],
      title: req.body[`features_title_${item}`]
    };
  });

  course.curriculumPdf = req.body.curriculumPdf;

  // save the course and check for errors
  course.save(async function(err) {
    if (err) {
      console.log("error", err);

      req.flash("danger", `Error ${err}`);
      let courses = await Course.find({})
        .sort({ order: 1 })
        .exec();
      res.render("admin/adminCourses", {
        courses,
        storys,
        course,
        courseFormConfig
      });
      return;
    }
    req.flash("success", `Successfully created ${course.title}`);
    res.redirect("/admin/courses");
  });
};
module.exports.deleteCourse = function(req, res, next) {
  Course.remove(
    {
      slug: req.params.slug
    },
    function(err, doc) {
      if (err) res.send(err);
      req.flash("success", `Successfully deleted ${doc.name}`);
      res.redirect("/admin/courses");
    }
  );
};
// Storage settings for project images
const storage = multer.diskStorage({
  destination: function(request, file, next) {
    next(null, "./temp");
  },
  filename: function(request, file, next) {
    next(null, file.originalname);
  }
});
module.exports.uploadImages = multer({
  storage,
  limits: {
    fileSize: 10000000 // 10 MB
  },
  fileFilter(req, file, next) {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      next(null, true);
    } else {
      next({ message: "That filetype is not allowed!" }, false);
    }
  }
}).fields([
  { name: "curriculumPdf", maxCount: 1 },
  { name: "icon", maxCount: 1 },
  { name: "subicon", maxCount: 1 },
  { name: "archivement_icon_1", maxCount: 1 },
  { name: "archivement_icon_2", maxCount: 1 },
  { name: "archivement_icon_3", maxCount: 1 },
  { name: "archivement_icon_4", maxCount: 1 },
  { name: "archivement_icon_5", maxCount: 1 },
  { name: "archivement_icon_6", maxCount: 1 },
  { name: "features_icon_1", maxCount: 1 },
  { name: "features_icon_2", maxCount: 1 },
  { name: "features_icon_3", maxCount: 1 },
  { name: "features_icon_4", maxCount: 1 },
  { name: "features_icon_5", maxCount: 1 },
  { name: "features_icon_6", maxCount: 1 }
]);

// Resize the images with different thumbnail sizes
//
exports.resizeImages = async (request, response, next) => {
  if (!request.files) {
    next();
    return;
  }
  for await (const singleFile of Object.values(request.files)) {
    request.body[
      singleFile[0].fieldname
    ] = `${singleFile[0].filename}`;
    try {
      if (singleFile[0].mimetype === "image/svg+xml" || singleFile[0].mimetype === "application/pdf") {
        const fileObject = fs.readFileSync(singleFile[0].path);
        fs.writeFileSync(
          `${process.env.IMAGE_UPLOAD_DIR}/${
            request.body[singleFile[0].fieldname]
          }`,
          fileObject
        );
      }
      if (singleFile[0].mimetype.startsWith("image/")) {
        const image = await jimp.read(singleFile[0].path);
        await image.cover(500, 500);
        await image.write(
          `${process.env.IMAGE_UPLOAD_DIR}/${
            request.body[singleFile[0].fieldname]
          }`
        );
        fs.unlinkSync(singleFile[0].path);
      }
    } catch (error) {
      console.log(error);
    }
  }
  next();
};

module.exports.updateCourse = async function(req, res) {
  let course = await Course.findOne({ slug: req.params.slug });
  course.slug = req.body.slug;
  course.icon = req.body.icon ? req.body.icon : course.icon;
  course.coloraccent = req.body.coloraccent ? req.body.coloraccent : "";
  course.headline = req.body.headline;
  course.subheading = req.body.subheading;
  course.title = req.body.title;
  course.subtitle = req.body.subtitle;
  course.successStory = !!req.body.successStory ? req.body.successStory : undefined;
  course.order = req.body.order;
  course.massnahmeNumber = req.body.massnahmenummer;
  course.massnahmeDetails = req.body.massnahmedetails;
  course.courselength = req.body.courselength;
  course.curriculumPdf = req.body.curriculumPdf;
  course.locations = req.body.locations;
  course.curriculumPdf = req.body.curriculumPdf;
  course.icon = req.files.icon ? req.body.icon : course.icon;
  course.subicon = req.files.subicon ? req.body.subicon : course.subicon;
  course.curriculumSectionSubheading = req.body.curriculumSectionSubheading;
  course.textColor = req.body.textColor;
  course.courseLanguages = req.body.courseLanguages;
  course.startInterval = req.body.startInterval;
  course.computerKnowledge = req.body.computerKnowledge;
  course.education = req.body.education;
  course.other = req.body.other;

  function verbose(inputs) {
    let items = [];
    let { itemsAmount, model, titles } = inputs;
    for (let i = 1; i <= itemsAmount; i++) {
      items.push(i);
    }

    if (items.length == itemsAmount) {
      items.map((_, i) => {
        titles.map(title => {
          if (!course[model][i]) {
            course[model][i] = {
              icon: "",
              description: ""
            };
          }
          if (req.body[`${title.reqChild}${i + 1}`] === ""){
            course[model][i][`title`] = ""
            course[model][i][`icon`] = ""
            course[model][i][`subtitle`] = ""
            course[model][i][`description`] = ""
          } else {
            course[model][i][title.dbChild] = req[
              model == "archivements" && title.dbChild == "icon"
              ? "files"
              : "body"
            ][`${title.reqChild}${i + 1}`]
            ? req.body[`${title.reqChild}${i + 1}`]
            : course[model][i][title.dbChild];
          }
        });
      });
    }
  }
  const archivements = {
    itemsAmount: 6,
    model: "archivements",
    titles: [
      {
        dbChild: "title",
        reqChild: "archivement_title_"
      },
      {
        dbChild: "icon",
        reqChild: "archivement_icon_"
      },
      {
        dbChild: "description",
        reqChild: "archivement_description_"
      }
    ]
  };

  const timeline = {
    itemsAmount: 6,
    model: "timeline",
    titles: [
      {
        dbChild: "title",
        reqChild: "timeline_title_"
      },
      {
        dbChild: "subtitle",
        reqChild: "timeline_subtitle_"
      },
      {
        dbChild: "time",
        reqChild: "timeline_time_"
      }
    ]
  };

  const features = {
    itemsAmount: 6,
    model: "features",
    titles: [
      {
        dbChild: "title",
        reqChild: "features_title_"
      },
      {
        dbChild: "subtitle",
        reqChild: "features_subtitle_"
      },
      {
        dbChild: "icon",
        reqChild: "features_icon_"
      }
    ]
  };
  verbose(archivements);
  verbose(timeline);
  verbose(features);
  try {
    await course.save();
    req.flash("success", `Successfully updated ${course.title}`);
    res.redirect("/admin/courses/edit/" + course.slug);
  } catch (error) {
    req.flash("danger", JSON.stringify(error));
    console.debug("error", error);
    res.redirect("/admin/courses/edit/" + course.slug);
  }

};

module.exports.setL18n = async (req, res) => {
  AbstractController.cloneSite(req, res, Course);
};
