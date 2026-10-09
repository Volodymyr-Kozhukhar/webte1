const SEMESTER_START = new Date(2026, 8, 14);
const SEMESTER_END = new Date(2026, 11, 14, 23, 59, 59);

const lessons = document.querySelectorAll(".schedule-table td[data-start]");
const scheduleMessage = document.querySelector("#schedule-message");
const semesterProgress = document.querySelector("#semester-progress");
const semesterMessage = document.querySelector("#semester-message");

function updateSchedule() {
    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const isSemester = now >= SEMESTER_START && now <= SEMESTER_END;
    const searchDate = now < SEMESTER_START ? SEMESTER_START : now;
    let activeLessons = 0;
    let nextLesson = null;
    let nextLessonDate = null;

    lessons.forEach(function (lesson) {
        const day = Number(lesson.parentElement.dataset.day);
        const start = Number(lesson.dataset.start);
        const end = Number(lesson.dataset.end);
        const isCurrent = isSemester && day === currentDay && currentMinutes >= start && currentMinutes < end;

        lesson.classList.toggle("current-lesson", isCurrent);

        if (isCurrent) {
            activeLessons++;
        }

        const lessonDate = new Date(searchDate);
        const daysUntilLesson = (day - searchDate.getDay() + 7) % 7;
        lessonDate.setDate(searchDate.getDate() + daysUntilLesson);
        lessonDate.setHours(Math.floor(start / 60), start % 60, 0, 0);

        if (lessonDate <= now) {
            lessonDate.setDate(lessonDate.getDate() + 7);
        }

        if (lessonDate <= SEMESTER_END && (nextLessonDate === null || lessonDate < nextLessonDate)) {
            nextLesson = lesson;
            nextLessonDate = lessonDate;
        }
    });

    if (activeLessons > 0) {
        scheduleMessage.textContent = "Práve prebiehajúca výučba je zvýraznená v rozvrhu.";
    } else if (nextLesson !== null) {
        const name = nextLesson.firstChild.textContent.trim();
        const date = nextLessonDate.toLocaleString("sk-SK", {
            weekday: "long",
            day: "numeric",
            month: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
        scheduleMessage.textContent = `Momentálne neprebieha žiadna výučba. Najbližšia hodina: ${name}, ${date}.`;
    } else {
        scheduleMessage.textContent = "Momentálne neprebieha žiadna výučba. V tomto semestri už nie sú naplánované ďalšie hodiny.";
    }

    const duration = SEMESTER_END - SEMESTER_START;
    const elapsed = now - SEMESTER_START;
    const percentage = Math.round(Math.max(0, Math.min(100, elapsed / duration * 100)));

    semesterProgress.value = percentage;
    semesterMessage.textContent = `Uplynulo ${percentage} % semestra.`;
}

updateSchedule();
setInterval(updateSchedule, 60000);

const filterButtons = document.querySelectorAll(".schedule-filter");
const filterMessage = document.querySelector("#filter-message");
const tableContainer = document.querySelector(".table-container");

filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        const filter = button.dataset.filter;
        let visibleLessons = 0;

        lessons.forEach(function (lesson) {
            const isVisible = filter === "all" || lesson.classList.contains(filter);
            lesson.classList.toggle("filtered-out", !isVisible);

            if (isVisible) {
                visibleLessons++;
            }
        });

        filterButtons.forEach(function (filterButton) {
            filterButton.setAttribute("aria-pressed", String(filterButton === button));
        });

        tableContainer.hidden = visibleLessons === 0;
        filterMessage.hidden = visibleLessons > 0;
        filterMessage.textContent = "Pre tento filter nie sú v rozvrhu žiadne hodiny.";
    });
});
