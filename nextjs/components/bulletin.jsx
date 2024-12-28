"use client";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";

const bulletinItems = [
  {
    title: "Tiedote 1",
    date: "2022-01-01",
    content:
      "Culpa mollit laborum ea officia eu aliqua ex veniam quis. Commodo laborum minim consequat Lorem proident elit cillum reprehenderit sit eu aliquip. Sit dolore nisi aliquip dolor ex. Velit sint ex consequat aliqua consequat nostrud. Aliqua eu do magna Lorem fugiat aliquip laboris do occaecat esse officia tempor. Nostrud laborum labore non minim incididunt magna incididunt qui officia. Dolore ut enim reprehenderit et consequat Lorem Lorem dolore officia laboris. Commodo cillum adipisicing proident pariatur nulla voluptate. Ex veniam proident proident ut dolore duis. Anim consectetur qui dolor nulla veniam sint mollit reprehenderit ut id consectetur. Voluptate quis voluptate eiusmod consectetur Lorem officia sit non culpa duis tempor. Qui veniam Lorem magna amet ullamco fugiat culpa qui velit minim voluptate velit.",
  },
  {
    title: "Tiedote 2",
    date: "2022-01-02",
    content:
      "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.",
  },
  {
    title: "Tiedote 3",
    date: "2022-01-03",
    content:
      "Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui.",
  },
  {
    title: "Tiedote 4",
    date: "2022-01-04",
    content:
      "Nulla porttitor accumsan tincidunt. Donec sollicitudin molestie malesuada.",
  },
  {
    title: "Tiedote 5",
    date: "2022-01-05",
    content: "Curabitur aliquet quam id dui posuere blandit.",
  },
  {
    title: "Tiedote 6",
    date: "2022-01-06",
    content:
      "Et laborum ut nulla commodo eu nulla consequat eiusmod sint. Amet incididunt mollit enim adipisicing ea voluptate velit pariatur excepteur cupidatat nostrud nostrud sint. Id ullamco do quis aute ex sit cupidatat ad culpa non officia est id fugiat. Sit aute officia eiusmod duis adipisicing enim cupidatat fugiat mollit officia sunt dolore ullamco enim. Tempor aute sint nulla ut sit culpa non voluptate est exercitation proident esse sint. Minim ipsum adipisicing voluptate eu sit culpa dolore mollit est qui. Velit nulla est nulla occaecat laboris laboris enim cupidatat. Duis ea labore aliquip nulla aute ad ipsum. Nisi exercitation esse et magna pariatur sit. Adipisicing magna incididunt pariatur aliquip nulla ipsum ipsum aute laboris. Occaecat incididunt ad laborum consectetur aliquip ullamco cillum ipsum. Duis consectetur consequat aute aliqua deserunt esse velit fugiat voluptate consequat dolore magna. Et pariatur anim nulla anim. Eiusmod dolor dolor laboris sit qui laborum non mollit culpa laborum irure minim veniam. Labore est sunt sint minim aliquip elit sint eiusmod enim sit velit. Voluptate non dolor adipisicing ipsum deserunt magna et Lorem aliquip minim dolore culpa. Pariatur nostrud ad nisi nisi id sint id. Minim consequat mollit esse dolore nisi eiusmod officia velit reprehenderit velit ad. Fugiat laboris labore deserunt laborum duis labore occaecat dolor. Dolor anim aute elit adipisicing eu. Est id dolor laboris consequat est do anim. Minim excepteur dolore dolor in aliqua ipsum sit sit. Fugiat ut adipisicing incididunt minim consectetur in excepteur nulla ullamco aliquip eiusmod. Amet Lorem laboris elit labore ipsum tempor amet voluptate mollit. Consectetur sint anim amet sint incididunt cillum elit do tempor occaecat ad velit reprehenderit. Duis culpa sint consectetur voluptate est magna nostrud cupidatat irure consequat exercitation occaecat officia. Deserunt non Lorem culpa reprehenderit magna nisi. Labore consequat est cupidatat culpa laboris ut incididunt. Pariatur nisi elit ea aliquip dolor. Laboris ex ad dolore qui minim voluptate dolor ea irure adipisicing irure cillum. Cupidatat sit exercitation velit exercitation reprehenderit eu eu occaecat duis aliqua. Voluptate magna non commodo incididunt reprehenderit commodo. Laboris ex minim qui cupidatat eiusmod labore et elit dolore aliquip occaecat. Laborum qui deserunt non dolor magna laboris. Laboris consequat minim do velit. Culpa in sit nulla cupidatat nostrud commodo minim aute. Sint minim minim est ea et nulla duis aute veniam. Ullamco officia duis aliquip consectetur do fugiat elit anim dolor do esse occaecat. Enim nisi sint pariatur irure in et amet. Irure labore ex minim officia pariatur magna in fugiat amet duis. Magna officia pariatur incididunt nulla aliquip dolore fugiat do voluptate ad aliquip elit. Occaecat ea ipsum sit proident dolore amet sint. Est fugiat commodo aliqua consequat qui labore dolor culpa eiusmod laborum laboris fugiat aliquip amet. Amet nulla anim enim laborum adipisicing dolore esse et. Minim duis ad veniam ex proident quis in mollit id dolore ad sint cillum. Quis minim voluptate esse pariatur reprehenderit. Labore ullamco sunt mollit reprehenderit sunt ullamco non aute. Voluptate proident eiusmod cillum incididunt. Duis pariatur adipisicing culpa deserunt tempor sit officia pariatur Lorem excepteur adipisicing amet.",
  },
];

const Bulletin = (props) => {
  return (
    <div className="w-full h-full flex flex-col gap-2">
      <span className="text-2xl text-center font-bold text-white mx-4 my-6 border-b border-white">
        Tiedotteet
      </span>
      {bulletinItems.map((item, index) => (
        <Disclosure key={index}>
          {({ open }) => (
            <div className="overflow-hidden shadow-md">
              <DisclosureButton
                className={
                  "flex justify-between items-center w-full px-6 py-2 min-h-96 bg-white bg-opacity-50 text-gray-800 hover:bg-gray-50 transition-all"
                }
              >
                <span className="font-semibold">{item.title}</span>
                <span className="text-sm text-gray-600">{item.date}</span>
                <span
                  className={`text-xl font-bold transform transition-transform ${
                    open ? "rotate-180" : "rotate-0"
                  }`}
                >
                  {open ? "−" : "+"}
                </span>
              </DisclosureButton>
              <DisclosurePanel className="px-6 py-4 bg-gray-50 text-gray-700">
                {item.content}
              </DisclosurePanel>
            </div>
          )}
        </Disclosure>
      ))}
    </div>
  );
};

export default Bulletin;
